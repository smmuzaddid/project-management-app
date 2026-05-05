import { useNavigate } from 'react-router-dom';

const stats = [
  { label: 'Setup Time', value: '5 min' },
  { label: 'Availability', value: '24/7' },
  { label: 'Channels', value: 'WhatsApp + Web' },
  { label: 'Built-in', value: 'CRM' },
];

const steps = [
  { n: '01', title: 'Describe', desc: 'Tell us about your business in a natural conversation — no forms, no technical knowledge needed.' },
  { n: '02', title: 'We Build', desc: 'Our AI automatically creates your custom agent, knowledge base, and configures everything.' },
  { n: '03', title: 'Go Live', desc: 'Your AI is live on WhatsApp and your website instantly. Scan the QR code and start selling.' },
];

const features = [
  { icon: '🤖', title: 'Custom AI Agent', desc: 'Trained on your business, products, and brand voice. Speaks like you, sells like a pro.' },
  { icon: '💬', title: 'WhatsApp Bot', desc: 'Scan a QR code — your AI starts responding on WhatsApp in minutes.' },
  { icon: '🌐', title: 'Web Widget', desc: 'One line of code adds the chat widget to any website.' },
  { icon: '🧠', title: 'Customer Memory', desc: 'Remembers every customer across conversations. Never asks twice.' },
  { icon: '📊', title: 'CRM Built-in', desc: 'Leads captured automatically. Track, filter, and update status from your dashboard.' },
  { icon: '🎯', title: '3 Sales Styles', desc: 'Aggressive closer, soft seller, or consultative advisor — you choose the personality.' },
];

const plans = [
  { id: 'free', name: 'Free', price: '$0', messages: '100 messages/mo', agents: '1 agent', popular: false },
  { id: 'starter', name: 'Starter', price: '$99', messages: '1,000 messages/mo', agents: '1 agent', popular: false },
  { id: 'growth', name: 'Growth', price: '$299', messages: '5,000 messages/mo', agents: '5 agents', popular: true },
  { id: 'business', name: 'Business', price: '$599', messages: '20,000 messages/mo', agents: '15 agents', popular: false },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#030712]/90 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-sm">T</div>
          <span className="font-semibold text-lg">Transformer</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">Login</button>
          <button onClick={() => navigate('/build')} className="text-sm bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">Build My AI →</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3 py-1 rounded-full mb-6">
          AI Agent Factory — No Code Required
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Describe your business.
          </span>
          <br />
          <span className="text-white">Get your AI.</span>
        </h1>
        <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Have a 5-minute conversation with our AI. It automatically builds you a custom sales agent,
          WhatsApp bot, and CRM — ready to sell in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate('/build')} className="bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25">
            Build My AI Agent →
          </button>
          <button onClick={() => navigate('/login')} className="border border-white/10 px-8 py-4 rounded-xl text-lg font-semibold text-white/70 hover:bg-white/5 transition-colors">
            Sign In
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5 text-center">
              <div className="text-2xl font-bold text-violet-400">{s.value}</div>
              <div className="text-sm text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-white/50 text-center mb-12">From description to live AI in under 5 minutes</p>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(s => (
            <div key={s.n} className="bg-white/3 border border-white/8 rounded-2xl p-6 relative overflow-hidden">
              <div className="text-6xl font-black text-white/5 absolute top-4 right-4">{s.n}</div>
              <div className="text-violet-400 font-bold text-sm mb-2">{s.n}</div>
              <h3 className="text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">Everything included</h2>
        <p className="text-white/50 text-center mb-12">One platform. Full AI sales stack.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-violet-500/30 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-white/50 text-center mb-12">Start free. Scale as you grow.</p>
        <div className="grid md:grid-cols-4 gap-4">
          {plans.map(p => (
            <div key={p.id} className={`relative rounded-2xl p-6 border ${p.popular ? 'bg-gradient-to-b from-violet-600/20 to-cyan-600/10 border-violet-500/50' : 'bg-white/3 border-white/8'}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              )}
              <div className="text-sm text-white/50 mb-1">{p.name}</div>
              <div className="text-3xl font-black mb-1">{p.price}</div>
              <div className="text-xs text-white/40 mb-4">/month</div>
              <div className="space-y-2 text-sm text-white/60">
                <div>✓ {p.messages}</div>
                <div>✓ {p.agents}</div>
                <div>✓ WhatsApp + Web</div>
                <div>✓ CRM included</div>
              </div>
              <button
                onClick={() => navigate('/build')}
                className={`w-full mt-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${p.popular ? 'bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90' : 'border border-white/10 hover:bg-white/5'}`}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-white/30 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-xs">T</div>
          <span className="font-medium text-white/50">Transformer</span>
        </div>
        <p>© 2025 Transformer. All rights reserved.</p>
      </footer>
    </div>
  );
}
