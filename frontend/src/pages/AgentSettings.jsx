import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const TABS = ['Overview', 'Knowledge', 'Products', 'WhatsApp', 'Settings'];

const COUNTRIES = [
  'UAE', 'USA', 'UK', 'Saudi Arabia', 'Canada', 'Australia',
  'Germany', 'France', 'India', 'Pakistan', 'Singapore',
  'Netherlands', 'Spain', 'Italy', 'Brazil', 'Mexico',
  'Egypt', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Jordan',
  'Nigeria', 'Kenya'
];

const styleOptions = [
  { id: 'aggressive', label: 'Aggressive Closer', desc: 'Creates urgency, pushes to close fast', icon: '🔥' },
  { id: 'soft', label: 'Soft Seller', desc: 'Friendly, never pushy, builds trust', icon: '🤝' },
  { id: 'consultative', label: 'Consultative', desc: 'Asks questions, gives expert advice', icon: '🎯' },
];

export default function AgentSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [tab, setTab] = useState(0);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waSetup, setWaSetup] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState('');
  const [newKnowledge, setNewKnowledge] = useState({ category: 'faq', title: '', content: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', currency: 'USD', description: '', payment_link: '' });
  const [settings, setSettings] = useState({ sales_style: '', payment_link: '', memory_enabled: true });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${API}/api/builder/agents/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setAgent(d);
        setSettings({ sales_style: d.sales_style || 'consultative', payment_link: d.payment_link || '', memory_enabled: d.memory_enabled ?? true });
        if (d.whatsapp_country) setSelectedCountry(d.whatsapp_country);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, token, navigate]);

  const loadWaSetup = () => {
    setWaLoading(true);
    fetch(`${API}/api/builder/agents/${id}/whatsapp-setup`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setWaSetup(d); setWaLoading(false); })
      .catch(() => setWaLoading(false));
  };

  useEffect(() => {
    if (tab === 3 && !waSetup) loadWaSetup();
  }, [tab]);

  const copy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const addKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return;
    const res = await fetch(`${API}/api/builder/agents/${id}/knowledge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newKnowledge),
    });
    const k = await res.json();
    setAgent(prev => ({ ...prev, tr_knowledge: [...(prev.tr_knowledge || []), k] }));
    setNewKnowledge({ category: 'faq', title: '', content: '' });
  };

  const deleteKnowledge = async (kid) => {
    await fetch(`${API}/api/builder/agents/${id}/knowledge/${kid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setAgent(prev => ({ ...prev, tr_knowledge: prev.tr_knowledge.filter(k => k.id !== kid) }));
  };

  const addProduct = async () => {
    if (!newProduct.name) return;
    const res = await fetch(`${API}/api/builder/agents/${id}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newProduct),
    });
    const p = await res.json();
    setAgent(prev => ({ ...prev, tr_products: [...(prev.tr_products || []), p] }));
    setNewProduct({ name: '', price: '', currency: 'USD', description: '', payment_link: '' });
  };

  const deleteProduct = async (pid) => {
    await fetch(`${API}/api/builder/agents/${id}/products/${pid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setAgent(prev => ({ ...prev, tr_products: prev.tr_products.filter(p => p.id !== pid) }));
  };

  const saveSettings = async () => {
    setSaving(true);
    await fetch(`${API}/api/builder/agents/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(settings),
    });
    setSaving(false);
  };

  const changeCountry = async () => {
    setProvisioning(true);
    setProvisionError('');
    try {
      const res = await fetch(`${API}/api/builder/agents/${id}/whatsapp-change-country`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country: selectedCountry }),
      });
      const data = await res.json();
      if (!res.ok) { setProvisionError(data.error || 'Provisioning failed'); return; }
      setWaSetup({ type: 'dedicated', phone_number: data.phone_number, country: data.country, qr: data.qr, waLink: data.waLink });
    } catch { setProvisionError('Connection error. Please try again.'); }
    finally { setProvisioning(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white/30">Loading...</div>;
  if (!agent) return <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white/30">Agent not found</div>;

  const embedCode = `<script src="${API}/embed.js?agent=${id}"></script>`;

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white transition-colors text-sm">← Dashboard</button>
          <span className="text-white/20">/</span>
          <span className="font-semibold">{agent.agent_name}</span>
        </div>
        <button onClick={() => navigate(`/agent/${id}/crm`)} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">View CRM →</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 mb-8">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === i ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">Embed Code</div>
              <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 break-all mb-3">{embedCode}</div>
              <button onClick={() => copy(embedCode)}
                className={`text-sm px-4 py-2 rounded-lg border transition-colors ${copied ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'border-white/10 hover:bg-white/5 text-white/60'}`}>
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-sm text-white/40 mb-1">Business</div>
                <div className="font-semibold">{agent.business_name}</div>
                <div className="text-sm text-white/40 mt-1">{agent.business_type}</div>
              </div>
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-sm text-white/40 mb-1">Knowledge Entries</div>
                <div className="text-2xl font-bold text-violet-400">{agent.tr_knowledge?.length || 0}</div>
                <div className="text-sm text-white/40 mt-1">{agent.tr_products?.length || 0} products</div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge */}
        {tab === 1 && (
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Add Knowledge Entry</h3>
              <div className="space-y-3">
                <select value={newKnowledge.category} onChange={e => setNewKnowledge({ ...newKnowledge, category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                  {['faq', 'product', 'policy', 'about'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={newKnowledge.title} onChange={e => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                  placeholder="Title" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                <textarea value={newKnowledge.content} onChange={e => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                  placeholder="Content" rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                <button onClick={addKnowledge} className="bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-lg text-sm font-medium">Add Entry</button>
              </div>
            </div>
            <div className="space-y-2">
              {(agent.tr_knowledge || []).map(k => (
                <div key={k.id} className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs text-violet-400 uppercase font-medium mr-2">{k.category}</span>
                    <span className="font-medium text-sm">{k.title}</span>
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{k.content}</p>
                  </div>
                  <button onClick={() => deleteKnowledge(k.id)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors flex-shrink-0">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {tab === 2 && (
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Add Product</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Product name" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                <input value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="Price" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                <select value={newProduct.currency} onChange={e => setNewProduct({ ...newProduct, currency: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none">
                  {['USD', 'AED', 'EUR', 'GBP', 'SAR'].map(c => <option key={c}>{c}</option>)}
                </select>
                <input value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Description" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                <input value={newProduct.payment_link} onChange={e => setNewProduct({ ...newProduct, payment_link: e.target.value })}
                  placeholder="Payment link (optional)" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <button onClick={addProduct} className="mt-3 bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-lg text-sm font-medium">Add Product</button>
            </div>
            <div className="space-y-2">
              {(agent.tr_products || []).map(p => (
                <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-sm">{p.name}</span>
                    {p.price && <span className="text-violet-400 text-sm ml-2">{p.currency} {p.price}</span>}
                    {p.description && <p className="text-xs text-white/40 mt-1">{p.description}</p>}
                  </div>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors flex-shrink-0">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp */}
        {tab === 3 && (
          <div className="space-y-4">
            {waLoading && !waSetup ? (
              <div className="text-center py-10 text-white/30">Loading WhatsApp setup...</div>
            ) : provisioning ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-green-600/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="font-semibold text-green-400">Provisioning your number...</div>
                <div className="text-sm text-white/40 mt-1">Searching for available numbers in {selectedCountry}</div>
              </div>
            ) : waSetup ? (
              <>
                {/* Status banner */}
                {waSetup.type === 'dedicated' ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-xl flex-shrink-0">✅</div>
                    <div>
                      <div className="font-bold text-green-400 text-lg">{waSetup.phone_number}</div>
                      <div className="text-sm text-white/50">Dedicated WhatsApp number · {waSetup.country}</div>
                    </div>
                    <a href={`https://wa.me/${(waSetup.phone_number || '').replace(/\D/g, '')}`}
                      target="_blank" rel="noreferrer"
                      className="ml-auto bg-green-600 hover:bg-green-500 transition-colors px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0">
                      Open in WhatsApp →
                    </a>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-xl flex-shrink-0">⚠️</div>
                    <div>
                      <div className="font-bold text-yellow-400">Sandbox Mode</div>
                      <div className="text-sm text-white/50">Using shared Twilio sandbox · {waSetup.phone_number}</div>
                    </div>
                  </div>
                )}

                {/* QR Code */}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 text-center">
                  <div className="font-semibold mb-4">
                    {waSetup.type === 'dedicated' ? 'Scan to start chatting' : 'Scan to connect sandbox'}
                  </div>
                  <div className="flex justify-center mb-4">
                    <img src={waSetup.qr} alt="WhatsApp QR" className="w-48 h-48 rounded-xl bg-white p-2" />
                  </div>
                  {waSetup.type === 'sandbox' && waSetup.sandbox_code && (
                    <div className="text-sm text-white/50">
                      Send <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">{waSetup.sandbox_code}</span> to connect
                    </div>
                  )}
                  <a href={waSetup.waLink} target="_blank" rel="noreferrer"
                    className="inline-block mt-4 bg-green-600 hover:bg-green-500 transition-colors px-6 py-2.5 rounded-lg text-sm font-semibold">
                    {waSetup.type === 'dedicated' ? 'Open in WhatsApp →' : 'Test on WhatsApp →'}
                  </a>
                </div>

                {/* Instructions */}
                {waSetup.type === 'sandbox' && (
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                    <h3 className="font-semibold mb-3">Sandbox Setup</h3>
                    <div className="space-y-3">
                      {[
                        'Open WhatsApp on your phone',
                        'Scan the QR code or tap "Test on WhatsApp"',
                        `Send "${waSetup.sandbox_code}" to join the sandbox`,
                        'Your AI agent will respond immediately!'
                      ].map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-white/60">
                          <div className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-400 text-xs flex-shrink-0">{i + 1}</div>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Country selector */}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                  <h3 className="font-semibold mb-1">
                    {waSetup.type === 'dedicated' ? 'Change WhatsApp Number Country' : 'Get a Dedicated Number'}
                  </h3>
                  <p className="text-sm text-white/40 mb-4">
                    {waSetup.type === 'dedicated'
                      ? 'Get a new number from a different country. Your current number will be released.'
                      : 'Provision a dedicated WhatsApp number for your business.'}
                  </p>
                  {provisionError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">{provisionError}</div>
                  )}
                  <div className="flex gap-3">
                    <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none">
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={changeCountry}
                      className="bg-violet-600 hover:bg-violet-500 transition-colors px-5 py-2.5 rounded-lg text-sm font-semibold">
                      {waSetup.type === 'dedicated' ? 'Change Country' : 'Get My Number'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <button onClick={loadWaSetup} className="text-violet-400 hover:text-violet-300 text-sm">Retry loading WhatsApp setup</button>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {tab === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Sales Style</h3>
              <div className="grid grid-cols-3 gap-3">
                {styleOptions.map(s => (
                  <button key={s.id} onClick={() => setSettings({ ...settings, sales_style: s.id })}
                    className={`p-4 rounded-xl border text-left transition-colors ${settings.sales_style === s.id ? 'border-violet-500 bg-violet-600/15' : 'border-white/8 bg-white/3 hover:border-white/20'}`}>
                    <div className="text-xl mb-2">{s.icon}</div>
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-xs text-white/40 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-1.5">Payment Link</label>
              <input value={settings.payment_link} onChange={e => setSettings({ ...settings, payment_link: e.target.value })}
                placeholder="https://pay.stripe.com/..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors" />
            </div>
            <div className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl p-4">
              <div>
                <div className="font-medium text-sm">Customer Memory</div>
                <div className="text-xs text-white/40 mt-0.5">Remember customers across conversations</div>
              </div>
              <button onClick={() => setSettings({ ...settings, memory_enabled: !settings.memory_enabled })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.memory_enabled ? 'bg-violet-600' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.memory_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <button onClick={saveSettings} disabled={saving}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
