const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { auth } = require('../middleware/auth');

const PLANS = {
  free: { name: 'Free', price: 0, messages: 100, agents: 1 },
  starter: { name: 'Starter', price: 99, messages: 1000, agents: 1 },
  growth: { name: 'Growth', price: 299, messages: 5000, agents: 5 },
  business: { name: 'Business', price: 599, messages: 20000, agents: 15 },
  enterprise: { name: 'Enterprise', price: 1499, messages: 100000, agents: 999 }
};

router.get('/plans', (req, res) => res.json(PLANS));

router.get('/usage', auth, async (req, res) => {
  try {
    const { data } = await supabase.from('tr_subscriptions').select('*').eq('user_id', req.user.id).single();
    res.json(data || { plan: 'free', messages_used: 0, monthly_message_limit: 100 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subscribe', auth, async (req, res) => {
  res.json({
    message: 'To upgrade, contact us on WhatsApp and we will set it up for you.',
    whatsapp: '+971562771905',
    plans: PLANS
  });
});

module.exports = router;
