const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { agentChat, extractLead } = require('../services/claude');
const { sendWhatsApp, sendWhatsAppSandbox, parseIncoming } = require('../services/twilio');
const { getMemory, saveMemory, getSession, saveSession, rateLimit } = require('../services/redis');

router.post('/incoming', express.urlencoded({ extended: false }), async (req, res) => {
  res.status(200).send('<Response></Response>');
  try {
    const { from, to, message, profileName } = parseIncoming(req.body);
    if (!from || !message) return;

    if (!await rateLimit(`wa:${from}`, 15)) {
      await sendWhatsAppSandbox(from, 'Please slow down a bit! 😊').catch(() => {});
      return;
    }

    const { data: agents } = await supabase.from('tr_agents')
      .select('*')
      .or(`whatsapp_number.eq.${to},twilio_sandbox_number.eq.${to}`)
      .eq('is_active', true)
      .eq('whatsapp_enabled', true)
      .limit(1);

    const agent = agents?.[0];
    if (!agent) { console.log('No agent found for number:', to); return; }

    const sid = `wa_${agent.id}_${from.replace(/\D/g, '')}`;
    const history = await getSession(sid);
    let memory = await getMemory(agent.id, from);
    if (!memory && profileName) {
      memory = await saveMemory(agent.id, from, { customer_name: profileName, conversation_count: 0 });
    }

    const updated = [...history, { role: 'user', content: message }];
    const { text, usage } = await agentChat(agent, updated, memory);
    const final = [...updated, { role: 'assistant', content: text }];
    await saveSession(sid, final);

    if (agent.whatsapp_number && agent.whatsapp_status === 'active') {
      await sendWhatsApp(agent.whatsapp_number, from, text)
        .catch(() => sendWhatsAppSandbox(from, text).catch(e => console.error('WA fallback error:', e.message)));
    } else {
      await sendWhatsAppSandbox(from, text).catch(e => console.error('WA sandbox error:', e.message));
    }

    await supabase.from('tr_usage_log').insert({
      user_id: agent.user_id, agent_id: agent.id, channel: 'whatsapp',
      tokens_used: usage.input + usage.output, cached_tokens: usage.cached, cost_usd: usage.cost
    }).catch(() => {});

    await supabase.from('tr_conversations').upsert({
      session_id: sid, agent_id: agent.id, customer_identifier: from,
      channel: 'whatsapp', messages: final.slice(-50), message_count: final.length,
      customer_name: memory?.customer_name, updated_at: new Date().toISOString()
    }, { onConflict: 'session_id' }).catch(() => {});

    if (final.length % 6 === 0) {
      const txt = final.map(m => `${m.role}: ${m.content}`).join('\n');
      const lead = await extractLead(txt).catch(() => null);
      if (lead && (lead.email || lead.phone || lead.name)) {
        await saveMemory(agent.id, from, {
          customer_name: lead.name || memory?.customer_name,
          customer_email: lead.email, customer_phone: from,
          conversation_count: (memory?.conversation_count || 0) + 1
        });
        const { data: conv } = await supabase.from('tr_conversations').select('id').eq('session_id', sid).single();
        await supabase.from('tr_leads').upsert({
          agent_id: agent.id, conversation_id: conv?.id,
          name: lead.name, email: lead.email, phone: from,
          interest: lead.interest, budget: lead.budget,
          channel: 'whatsapp', status: 'new'
        }, { onConflict: 'agent_id,phone' }).catch(() => {});
      }
    }
  } catch (err) { console.error('WA webhook error:', err.message); }
});

module.exports = router;
