const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../services/supabase');
const { auth } = require('../middleware/auth');
const { clearCache, getBuildSession, saveBuildSession } = require('../services/redis');
const {
  COUNTRY_CODES, searchAvailableNumbers, provisionWhatsAppNumber,
  releaseNumber, getClient, generateDedicatedQR, generateSandboxQR
} = require('../services/twilio');
const { metaChat, buildSystemPrompt, buildKnowledge, buildWelcome } = require('../services/claude');

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    const sid = sessionId || uuidv4();

    const [{ data: dbSession }, cachedSession] = await Promise.all([
      supabase.from('tr_build_sessions').select('*').eq('session_id', sid).maybeSingle(),
      getBuildSession(sid)
    ]);
    const session = dbSession || cachedSession || {};
    const history = Array.isArray(session.messages) ? session.messages : [];
    const updated = [...history, { role: 'user', content: message }];
    const aiText = await metaChat(updated);
    const final = [...updated, { role: 'assistant', content: aiText }];

    let buildData = null;
    const match = aiText.match(/```json\n([\s\S]*?)\n```/);
    if (match) { try { buildData = JSON.parse(match[1]); } catch {} }

    let agentId = session?.agent_id;
    let status = session?.build_status || 'in_progress';
    let builtAgent = null;
    let whatsappSetup = null;

    if (buildData?.ready_to_build && !agentId) {
      status = 'building';
      const buildingSession = {
        session_id: sid, user_id: userId || null, messages: final,
        extracted_data: buildData, build_status: 'building', updated_at: new Date().toISOString()
      };
      await saveBuildSession(sid, buildingSession);
      await supabase.from('tr_build_sessions').upsert(buildingSession, { onConflict: 'session_id' }).catch(() => {});

      try {
        const [systemPrompt, knowledge, welcome] = await Promise.all([
          buildSystemPrompt(buildData), buildKnowledge(buildData), buildWelcome(buildData)
        ]);

        let whatsappNumber = null;
        let whatsappSid = null;
        let whatsappData = null;
        const requestedCountry = buildData.whatsapp_country || 'USA';
        const countryCode = COUNTRY_CODES[requestedCountry] || 'US';

        try {
          console.log(`Searching WhatsApp numbers for ${requestedCountry} (${countryCode})...`);
          const available = await searchAvailableNumbers(countryCode);
          if (available.length > 0) {
            const provisioned = await provisionWhatsAppNumber(available[0].phoneNumber, 'temp');
            whatsappNumber = provisioned.phoneNumber;
            whatsappSid = provisioned.sid;
            const qrData = await generateDedicatedQR(whatsappNumber);
            whatsappData = { ...qrData, type: 'dedicated', country: requestedCountry };
            console.log('WhatsApp number provisioned:', whatsappNumber);
          } else {
            throw new Error('No numbers available');
          }
        } catch (waErr) {
          console.error('WhatsApp provisioning failed, using sandbox:', waErr.message);
          const qrData = await generateSandboxQR(process.env.TWILIO_SANDBOX_CODE || 'join transformer');
          whatsappData = { ...qrData, type: 'sandbox' };
        }

        const { data: agent, error } = await supabase.from('tr_agents').insert({
          user_id: userId || null,
          agent_name: buildData.agent_name || 'AI Assistant',
          business_name: buildData.business_name,
          business_type: buildData.business_type,
          business_description: buildData.business_description,
          target_customers: buildData.target_customers,
          agent_mode: buildData.agent_mode || 'sales_support',
          sales_style: buildData.sales_style || 'consultative',
          system_prompt: systemPrompt,
          welcome_message: welcome,
          payment_link: buildData.payment_link || null,
          whatsapp_enabled: true,
          whatsapp_number: whatsappNumber,
          whatsapp_number_sid: whatsappSid,
          whatsapp_country: requestedCountry,
          whatsapp_status: whatsappNumber ? 'active' : 'sandbox',
          whatsapp_qr_code: whatsappData.qr,
          whatsapp_wa_link: whatsappData.waLink,
          whatsapp_sandbox_code: process.env.TWILIO_SANDBOX_CODE,
          twilio_sandbox_number: process.env.TWILIO_SANDBOX_NUMBER,
          is_active: true,
          is_published: true
        }).select().single();

        if (error) throw error;

        if (whatsappSid && whatsappNumber) {
          const tc = getClient();
          if (tc) {
            await tc.incomingPhoneNumbers(whatsappSid).update({
              friendlyName: 'Transformer - ' + agent.id,
              smsUrl: (process.env.APP_URL || 'http://localhost:5001') + '/api/whatsapp/incoming'
            }).catch(e => console.error('Webhook update error:', e.message));
          }
          await supabase.from('tr_phone_numbers').insert({
            agent_id: agent.id, user_id: userId || null,
            phone_number: whatsappNumber, phone_sid: whatsappSid,
            country_code: countryCode, country_name: requestedCountry,
            monthly_cost: 1.00, status: 'active'
          }).catch(() => {});
        }

        agentId = agent.id;
        builtAgent = agent;
        status = 'completed';
        whatsappSetup = whatsappData;

        if (knowledge.length) {
          await supabase.from('tr_knowledge').insert(knowledge.map(k => ({ agent_id: agent.id, ...k, is_active: true })));
        }
        await supabase.from('tr_build_sessions').update({ agent_id: agent.id, build_status: 'completed' }).eq('session_id', sid).catch(() => {});

      } catch (e) {
        console.error('Build failed:', e.message);
        status = 'failed';
      }
    }

    const savedSession = {
      session_id: sid, user_id: userId || null, messages: final,
      extracted_data: buildData || session?.extracted_data || {},
      build_status: status, agent_id: agentId, updated_at: new Date().toISOString()
    };
    await saveBuildSession(sid, savedSession);
    await supabase.from('tr_build_sessions').upsert(savedSession, { onConflict: 'session_id' }).catch(() => {});

    res.json({
      response: aiText, sessionId: sid, buildStatus: status, agentId,
      builtAgent: builtAgent ? {
        id: builtAgent.id, agent_name: builtAgent.agent_name,
        business_name: builtAgent.business_name,
        api_key: builtAgent.api_key, embed_code: builtAgent.embed_code
      } : null,
      whatsappSetup
    });
  } catch (err) {
    console.error('Builder error:', err.message);
    res.status(500).json({ error: 'Builder unavailable. Please try again.' });
  }
});

router.get('/agents', auth, async (req, res) => {
  try {
    const { data } = await supabase.from('tr_agents').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agents/:id', auth, async (req, res) => {
  try {
    const { data } = await supabase.from('tr_agents')
      .select('*, tr_knowledge(*), tr_products(*)')
      .eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!data) return res.status(404).json({ error: 'Agent not found' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/agents/:id', auth, async (req, res) => {
  try {
    const { data } = await supabase.from('tr_agents')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    await clearCache(req.params.id);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/agents/:id/knowledge', auth, async (req, res) => {
  try {
    const { data: a } = await supabase.from('tr_agents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!a) return res.status(403).json({ error: 'Access denied' });
    const { data } = await supabase.from('tr_knowledge').insert({ agent_id: req.params.id, ...req.body, is_active: true }).select().single();
    await clearCache(req.params.id);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/agents/:id/knowledge/:kid', auth, async (req, res) => {
  try {
    const { data: a } = await supabase.from('tr_agents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!a) return res.status(403).json({ error: 'Access denied' });
    await supabase.from('tr_knowledge').delete().eq('id', req.params.kid).eq('agent_id', req.params.id);
    await clearCache(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/agents/:id/products', auth, async (req, res) => {
  try {
    const { data: a } = await supabase.from('tr_agents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!a) return res.status(403).json({ error: 'Access denied' });
    const { data } = await supabase.from('tr_products').insert({ agent_id: req.params.id, ...req.body }).select().single();
    await clearCache(req.params.id);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/agents/:id/products/:pid', auth, async (req, res) => {
  try {
    const { data: a } = await supabase.from('tr_agents').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!a) return res.status(403).json({ error: 'Access denied' });
    await supabase.from('tr_products').delete().eq('id', req.params.pid).eq('agent_id', req.params.id);
    await clearCache(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agents/:id/whatsapp-setup', auth, async (req, res) => {
  try {
    const { data: agent } = await supabase.from('tr_agents')
      .select('id, whatsapp_number, whatsapp_status, whatsapp_qr_code, whatsapp_wa_link, whatsapp_country, twilio_sandbox_number, whatsapp_sandbox_code, agent_name')
      .eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!agent) return res.status(403).json({ error: 'Access denied' });

    if (agent.whatsapp_status === 'active' && agent.whatsapp_number) {
      const qrData = await generateDedicatedQR(agent.whatsapp_number);
      res.json({
        type: 'dedicated',
        phone_number: agent.whatsapp_number,
        country: agent.whatsapp_country,
        qr: agent.whatsapp_qr_code || qrData.qr,
        waLink: agent.whatsapp_wa_link || qrData.waLink,
        agent_name: agent.agent_name
      });
    } else {
      const sandboxCode = agent.whatsapp_sandbox_code || process.env.TWILIO_SANDBOX_CODE;
      const qrData = await generateSandboxQR(sandboxCode);
      res.json({
        type: 'sandbox',
        phone_number: agent.twilio_sandbox_number || process.env.TWILIO_SANDBOX_NUMBER,
        sandbox_code: sandboxCode,
        qr: qrData.qr,
        waLink: qrData.waLink,
        agent_name: agent.agent_name
      });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/agents/:id/whatsapp-change-country', auth, async (req, res) => {
  try {
    const { country } = req.body;
    if (!country) return res.status(400).json({ error: 'Country required' });

    const { data: agent } = await supabase.from('tr_agents').select('*')
      .eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!agent) return res.status(403).json({ error: 'Access denied' });

    const countryCode = COUNTRY_CODES[country] || 'US';
    const available = await searchAvailableNumbers(countryCode);
    if (!available.length) {
      return res.status(404).json({ error: `No numbers available for ${country}. Try another country.` });
    }

    if (agent.whatsapp_number_sid) {
      await releaseNumber(agent.whatsapp_number_sid).catch(() => {});
    }

    const provisioned = await provisionWhatsAppNumber(available[0].phoneNumber, agent.id);
    const qrData = await generateDedicatedQR(provisioned.phoneNumber);

    await supabase.from('tr_agents').update({
      whatsapp_number: provisioned.phoneNumber,
      whatsapp_number_sid: provisioned.sid,
      whatsapp_country: country,
      whatsapp_status: 'active',
      whatsapp_qr_code: qrData.qr,
      whatsapp_wa_link: qrData.waLink,
      updated_at: new Date().toISOString()
    }).eq('id', agent.id);

    await supabase.from('tr_phone_numbers').insert({
      agent_id: agent.id, user_id: req.user.id,
      phone_number: provisioned.phoneNumber, phone_sid: provisioned.sid,
      country_code: countryCode, country_name: country,
      monthly_cost: 1.00, status: 'active'
    }).catch(() => {});

    await clearCache(agent.id);

    res.json({
      success: true,
      phone_number: provisioned.phoneNumber,
      country,
      qr: qrData.qr,
      waLink: qrData.waLink
    });
  } catch (err) {
    console.error('Country change error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
