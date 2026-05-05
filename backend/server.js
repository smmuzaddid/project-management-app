require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use('/api/whatsapp/incoming', express.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, max: 30 }));
app.use('/api/builder/chat', rateLimit({ windowMs: 60 * 1000, max: 20 }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/builder', require('./routes/builder'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/billing', require('./routes/billing'));

app.get('/health', (req, res) => res.json({ status: 'ok', platform: 'Transformer v1' }));

app.get('/embed.js', (req, res) => {
  const agentId = req.query.agent;
  if (!agentId) return res.status(400).send('// Missing agent id');
  const apiBase = process.env.APP_URL || `http://localhost:${process.env.PORT || 5001}`;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){var API=${JSON.stringify(apiBase)},AGENT=${JSON.stringify(agentId)},sid='w'+Math.random().toString(36).substr(2,9),open=false;var s=document.createElement('style');s.textContent='#trw *{box-sizing:border-box;font-family:sans-serif}#trb{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#0891b2);border:none;cursor:pointer;color:white;font-size:20px;box-shadow:0 4px 20px rgba(124,58,237,0.4)}#trbox{display:none;width:340px;height:480px;background:#0f0f0f;border:1px solid rgba(255,255,255,0.1);border-radius:16px;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);margin-bottom:10px}';document.head.appendChild(s);var w=document.createElement('div');w.id='trw';w.style.cssText='position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;flex-direction:column;align-items:flex-end';var box=document.createElement('div');box.id='trbox';box.innerHTML='<div style="background:linear-gradient(135deg,#7c3aed,#0891b2);padding:12px 16px;color:white;font-size:13px;font-weight:600">AI Assistant <span style="opacity:0.6;font-size:11px">● Online</span></div><div id="trm" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px"></div><div style="display:flex;gap:6px;padding:10px;border-top:1px solid rgba(255,255,255,0.06)"><input id="tri" style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:white;font-size:13px;outline:none" placeholder="Type a message..."><button onclick="ts()" style="background:#7c3aed;border:none;border-radius:8px;padding:8px 14px;color:white;cursor:pointer">Send</button></div>';var fab=document.createElement('button');fab.id='trb';fab.innerHTML='💬';function msg(t,u){var m=document.createElement('div');m.style.cssText='max-width:82%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap;align-self:'+(u?'flex-end':'flex-start')+';background:'+(u?'#7c3aed':'rgba(255,255,255,0.07)')+';color:'+(u?'white':'#e2e8f0')+(u?'':';border:1px solid rgba(255,255,255,0.08)');m.textContent=t;var msgs=document.getElementById('trm');msgs.appendChild(m);msgs.scrollTop=msgs.scrollHeight;}window.ts=async function(){var inp=document.getElementById('tri'),t=inp.value.trim();if(!t)return;inp.value='';msg(t,true);try{var r=await fetch(API+'/api/chat/'+AGENT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,sessionId:sid})});var d=await r.json();if(d.response)msg(d.response,false);}catch(e){msg('Connection error. Please try again.',false);}};document.getElementById('tri').onkeydown=function(e){if(e.key==='Enter')window.ts();};fab.onclick=function(){open=!open;box.style.display=open?'flex':'none';fab.innerHTML=open?'✕':'💬';if(open&&!document.getElementById('trm').children.length){fetch(API+'/api/chat/'+AGENT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'hi',sessionId:sid})}).then(r=>r.json()).then(d=>{if(d.response)msg(d.response,false);}).catch(()=>{});}};w.appendChild(box);w.appendChild(fab);document.body.appendChild(w);})();`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Transformer running on port ${PORT}`));
