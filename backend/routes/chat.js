const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../services/supabase');
const { agentChat, extractLead } = require('../services/claude');
const { getMemory, saveMemory, getSession, saveSession, rateLimit } = require('../services/redis');

router.post('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    const sid = sessionId || uuidv4();
    if (!await rateLimit(`web:${sid}`, 25)) return res.status(429).json({ error: 'Too many messages. Please slow down.' });
    const { data: agent } = await supabase.from('tr_agents')
      .select('*').eq('id', agentId).eq('is_active', true).eq('is_published', true).single();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const history = await getSession(sid);
    const memory = await getMemory(agent.id, sid);
    const updated = [...history, { role: 'user', content: message }];
    const { text, usage } = await agentChat(agent, updated, memory);
    const final = [...updated, { role: 'assistant', content: text }];
    await saveSession(sid, final);
    await supabase.from('tr_usage_log').insert({
      user_id: agent.user_id, agent_id: agentId, channel: 'web',
      tokens_used: usage.input + usage.output, cached_tokens: usage.cached, cost_usd: usage.cost
    }).catch(() => {});
    await supabase.from('tr_conversations').upsert({
      session_id: sid, agent_id: agentId, channel: 'web',
      messages: final.slice(-30), message_count: final.length, updated_at: new Date().toISOString()
    }, { onConflict: 'session_id' }).catch(() => {});
    if (final.length % 6 === 0) {
      const txt = final.map(m => `${m.role}: ${m.content}`).join('\n');
      const lead = await extractLead(txt).catch(() => null);
      if (lead && (lead.email || lead.phone || lead.name)) {
        await saveMemory(agent.id, sid, {
          customer_name: lead.name, customer_email: lead.email,
          conversation_count: (memory?.conversation_count || 0) + 1
        });
        const { data: conv } = await supabase.from('tr_conversations').select('id').eq('session_id', sid).single();
        await supabase.from('tr_leads').insert({
          agent_id: agentId, conversation_id: conv?.id, name: lead.name,
          email: lead.email, interest: lead.interest, budget: lead.budget, channel: 'web', status: 'new'
        }).catch(() => {});
      }
    }
    res.json({ response: text, sessionId: sid });
  } catch (err) { console.error('Chat error:', err.message); res.status(500).json({ error: 'Chat unavailable. Please try again.' }); }
});

module.exports = router;
