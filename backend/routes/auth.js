const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../services/supabase');
const { auth } = require('../middleware/auth');

const sign = (u) => jwt.sign(
  { id: u.id, email: u.email, role: u.role, name: u.full_name },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, company_name } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ error: 'Email, password and name required' });
    const hash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('tr_users')
      .insert({ email, password_hash: hash, full_name, company_name })
      .select('id, email, full_name, role')
      .single();
    if (error) return res.status(400).json({ error: 'Email already registered' });
    await supabase.from('tr_subscriptions').insert({ user_id: user.id, plan: 'free', monthly_message_limit: 100 });
    res.json({ token: sign(user), user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user } = await supabase
      .from('tr_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const u = { id: user.id, email: user.email, role: user.role, name: user.full_name };
    res.json({ token: sign(u), user: u });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('tr_users')
      .select('id, email, full_name, company_name, role')
      .eq('id', req.user.id)
      .single();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
