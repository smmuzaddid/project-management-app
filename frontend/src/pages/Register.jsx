import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', company_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch { setError('Connection error. Please try again.'); }
    finally { setLoading(false); }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="text-sm text-white/60 block mb-1.5">{label}</label>
      <input
        type={type} required={key !== 'company_name'} value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold">T</div>
          <span className="text-xl font-semibold">Transformer</span>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-white/50 text-sm mb-6">Build your first AI agent in minutes</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {field('full_name', 'Full Name', 'text', 'John Smith')}
            {field('company_name', 'Company Name (optional)', 'text', 'My Business')}
            {field('email', 'Email', 'email', 'you@company.com')}
            {field('password', 'Password', 'password', '••••••••')}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
