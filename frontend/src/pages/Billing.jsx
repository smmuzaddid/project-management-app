import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', messages: 100, agents: 1 },
  { id: 'starter', name: 'Starter', price: '$99', messages: 1000, agents: 1 },
  { id: 'growth', name: 'Growth', price: '$299', messages: 5000, agents: 5, popular: true },
  { id: 'business', name: 'Business', price: '$599', messages: 20000, agents: 15 },
  { id: 'enterprise', name: 'Enterprise', price: '$1,499', messages: 100000, agents: 999 },
];

export default function Billing() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${API}/api/billing/usage`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setUsage).catch(() => {});
  }, [token, navigate]);

  const pct = usage ? Math.min(100, Math.round(((usage.messages_used || 0) / (usage.monthly_message_limit || 100)) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#030712]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white transition-colors text-sm">← Dashboard</button>
          <span className="text-white/20">/</span>
          <span className="font-semibold">Billing</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Billing & Usage</h1>

        {/* Current Usage */}
        {usage && (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-white/40">Current Plan</div>
                <div className="text-xl font-bold capitalize">{usage.plan}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/40">Messages Used</div>
                <div className="text-xl font-bold">{usage.messages_used || 0} / {usage.monthly_message_limit}</div>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-violet-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs text-white/30 mt-1">{pct}% used this month</div>
          </div>
        )}

        {/* Plans */}
        <h2 className="text-lg font-semibold mb-4">Upgrade Your Plan</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {PLANS.filter(p => p.id !== 'free').map(plan => (
            <div key={plan.id} className={`relative rounded-2xl p-5 border ${plan.popular ? 'bg-gradient-to-b from-violet-600/20 to-transparent border-violet-500/40' : 'bg-white/3 border-white/8'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              )}
              <div className="text-sm text-white/50">{plan.name}</div>
              <div className="text-3xl font-black mt-1 mb-3">{plan.price}<span className="text-sm font-normal text-white/40">/mo</span></div>
              <div className="space-y-1.5 text-sm text-white/60 mb-4">
                <div>✓ {plan.messages.toLocaleString()} messages/month</div>
                <div>✓ {plan.agents === 999 ? 'Unlimited' : plan.agents} agent{plan.agents !== 1 ? 's' : ''}</div>
                <div>✓ WhatsApp + Web widget</div>
                <div>✓ CRM & lead tracking</div>
                <div>✓ Customer memory</div>
              </div>
              <a
                href="https://wa.me/971562771905"
                target="_blank"
                rel="noreferrer"
                className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.popular ? 'bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90' : 'border border-white/10 hover:bg-white/5'}`}
              >
                Get {plan.name}
              </a>
            </div>
          ))}
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 text-center">
          <div className="text-xl mb-1">💬</div>
          <div className="font-semibold mb-1">Pay via WhatsApp</div>
          <p className="text-sm text-white/50 mb-4">Contact us to upgrade your plan. We'll set it up manually and confirm via WhatsApp.</p>
          <a href="https://wa.me/971562771905" target="_blank" rel="noreferrer"
            className="inline-block bg-green-600 hover:bg-green-500 transition-colors px-6 py-2.5 rounded-lg text-sm font-semibold">
            Contact on WhatsApp →
          </a>
        </div>
      </div>
    </div>
  );
}
