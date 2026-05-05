import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const styleColors = {
  aggressive: 'bg-red-500/10 text-red-400 border-red-500/20',
  soft: 'bg-green-500/10 text-green-400 border-green-500/20',
  consultative: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${API}/api/builder/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, navigate]);

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-sm">T</div>
          <span className="font-semibold">Transformer</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/40">{user.email}</span>
          <button onClick={() => navigate('/billing')} className="text-sm text-white/50 hover:text-white transition-colors">Billing</button>
          <button onClick={logout} className="text-sm text-white/50 hover:text-white transition-colors">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your AI Agents</h1>
            <p className="text-white/40 text-sm mt-1">{agents.length} agent{agents.length !== 1 ? 's' : ''} active</p>
          </div>
          <button
            onClick={() => navigate('/build')}
            className="bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Build New Agent
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-24 bg-white/3 border border-white/8 rounded-2xl">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-bold mb-2">No agents yet</h2>
            <p className="text-white/40 text-sm mb-6">Build your first AI agent in under 5 minutes</p>
            <button
              onClick={() => navigate('/build')}
              className="bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Build My First Agent →
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-400' : 'bg-white/20'}`}></div>
                    <h3 className="font-bold">{agent.agent_name}</h3>
                  </div>
                  {agent.sales_style && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${styleColors[agent.sales_style] || styleColors.consultative}`}>
                      {agent.sales_style}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 mb-1">{agent.business_name}</p>
                <p className="text-xs text-white/30 mb-3">{agent.business_type}</p>

                {agent.whatsapp_number ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full mb-3 w-fit">
                    <span>💬</span> {agent.whatsapp_number}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full mb-3 w-fit">
                    <span>⚠️</span> Sandbox
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/agent/${agent.id}`)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => navigate(`/agent/${agent.id}/crm`)}
                    className="flex-1 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 py-2 rounded-lg text-sm font-medium text-violet-400 transition-colors"
                  >
                    CRM
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
