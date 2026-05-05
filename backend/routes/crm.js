const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { auth } = require('../middleware/auth');

const own = async (id, uid) => {
  const { data } = await supabase.from('tr_agents').select('id').eq('id', id).eq('user_id', uid).single();
  return !!data;
};

router.get('/:agentId/leads', auth, async (req, res) => {
  try {
    if (!await own(req.params.agentId, req.user.id)) return res.status(403).json({ error: 'Access denied' });
    const { data } = await supabase.from('tr_leads').select('*').eq('agent_id', req.params.agentId).order('created_at', { ascending: false });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:agentId/leads/:id', auth, async (req, res) => {
  try {
    if (!await own(req.params.agentId, req.user.id)) return res.status(403).json({ error: 'Access denied' });
    const { data } = await supabase.from('tr_leads')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('agent_id', req.params.agentId)
      .select().single();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:agentId/stats', auth, async (req, res) => {
  try {
    if (!await own(req.params.agentId, req.user.id)) return res.status(403).json({ error: 'Access denied' });
    const [l, c] = await Promise.all([
      supabase.from('tr_leads').select('status').eq('agent_id', req.params.agentId),
      supabase.from('tr_conversations').select('id', { count: 'exact' }).eq('agent_id', req.params.agentId)
    ]);
    const byStatus = {};
    (l.data || []).forEach(x => { byStatus[x.status] = (byStatus[x.status] || 0) + 1; });
    res.json({ total_leads: l.data?.length || 0, total_conversations: c.count || 0, by_status: byStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
