import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const STATUSES = ['new', 'contacted', 'qualified', 'closed_won', 'closed_lost'];
const statusColors = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contacted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  qualified: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  closed_won: 'bg-green-500/10 text-green-400 border-green-500/20',
  closed_lost: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CRMView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    Promise.all([
      fetch(`${API}/api/crm/${id}/leads`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/crm/${id}/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([l, s]) => {
      setLeads(Array.isArray(l) ? l : []);
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, token, navigate]);

  const updateStatus = async (leadId, status) => {
    await fetch(`${API}/api/crm/${id}/leads/${leadId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
  };

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/agent/${id}`)} className="text-white/40 hover:text-white transition-colors text-sm">← Agent Settings</button>
          <span className="text-white/20">/</span>
          <span className="font-semibold">CRM</span>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-white/40 hover:text-white transition-colors">Dashboard</button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Leads & CRM</h1>
            <p className="text-white/40 text-sm mt-1">{leads.length} total leads</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <div className="text-2xl font-bold">{stats.total_leads}</div>
              <div className="text-xs text-white/40 mt-0.5">Total Leads</div>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">{stats.total_conversations}</div>
              <div className="text-xs text-white/40 mt-0.5">Conversations</div>
            </div>
            {STATUSES.slice(0, 3).map(s => (
              <div key={s} className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="text-2xl font-bold">{stats.by_status?.[s] || 0}</div>
                <div className="text-xs text-white/40 mt-0.5 capitalize">{s.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === 'all' ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>All</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${filter === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white/3 border border-white/8 rounded-2xl text-white/30">
            No leads yet. When your AI captures contact info, they'll appear here.
          </div>
        ) : (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8">
                <tr className="text-white/40 text-left">
                  {['Name', 'Contact', 'Channel', 'Interest', 'Budget', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 font-medium">{lead.name || '—'}</td>
                    <td className="px-4 py-3 text-white/50">
                      {lead.email && <div>{lead.email}</div>}
                      {lead.phone && <div className="text-xs">{lead.phone}</div>}
                      {!lead.email && !lead.phone && '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${lead.channel === 'whatsapp' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {lead.channel || 'web'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 max-w-xs truncate">{lead.interest || '—'}</td>
                    <td className="px-4 py-3 text-white/50">{lead.budget || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status || 'new'}
                        onChange={e => updateStatus(lead.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-lg border bg-transparent outline-none cursor-pointer ${statusColors[lead.status] || statusColors.new}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s} className="bg-[#030712] text-white capitalize">{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
