import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export default function Builder() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Great. What type of business do you run, and what do you sell?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [buildStatus, setBuildStatus] = useState(null);
  const [builtAgent, setBuiltAgent] = useState(null);
  const [whatsappSetup, setWhatsappSetup] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const userId = JSON.parse(localStorage.getItem('user') || 'null')?.id;

  const send = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    try {
      const res = await fetch(`${API}/api/builder/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Builder unavailable. Please try again.');
      }
      if (data.response) {
        const isJSON = data.response.includes('```json');
        if (!isJSON) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        }
      }
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.buildStatus) setBuildStatus(data.buildStatus);
      if (data.builtAgent) setBuiltAgent(data.builtAgent);
      if (data.whatsappSetup) setWhatsappSetup(data.whatsappSetup);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, sessionId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (buildStatus === 'completed' && builtAgent) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2">Your AI is Ready!</h1>
            <p className="text-white/50">Meet <span className="text-violet-400 font-semibold">{builtAgent.agent_name}</span> — your new AI sales agent</p>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-4">
            <div className="text-green-400 font-semibold mb-3">✓ Agent Built Successfully</div>
            <div className="text-sm text-white/60 space-y-1">
              <div>Business: {builtAgent.business_name}</div>
              <div>Agent: {builtAgent.agent_name}</div>
            </div>
          </div>

          {whatsappSetup && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span>💬</span> Connect WhatsApp
              </h3>
              <div className="flex justify-center mb-4">
                <img src={whatsappSetup.qr} alt="WhatsApp QR" className="w-40 h-40 rounded-xl" />
              </div>
              <div className="space-y-2 text-sm text-white/60">
                <p>1. Open WhatsApp on your phone</p>
                <p>2. Scan the QR code above</p>
                <p>3. Send the message that auto-fills</p>
                <p>4. Your AI will respond immediately!</p>
              </div>
              <a
                href={whatsappSetup.waLink} target="_blank" rel="noreferrer"
                className="block mt-4 bg-green-600 hover:bg-green-500 transition-colors text-center py-3 rounded-lg text-sm font-semibold"
              >
                Test on WhatsApp →
              </a>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Open Dashboard →
            </button>
            {userId && (
              <button
                onClick={() => navigate(`/agent/${builtAgent.id}`)}
                className="flex-1 border border-white/10 py-3 rounded-xl font-semibold hover:bg-white/5 transition-colors text-white/70"
              >
                Customize Agent
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (buildStatus === 'building') {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600/30 border-t-violet-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold mb-2">Building your AI system...</h2>
          <p className="text-white/50 text-sm">Creating agent, writing knowledge base, generating system prompt</p>
          <p className="text-white/30 text-xs mt-2">This takes about 20-30 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-sm flex-shrink-0">T</div>
        <div>
          <div className="font-semibold">Transformer</div>
          <div className="text-xs text-white/40">AI Agent Builder</div>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">T</div>
            )}
            <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-white/5 border border-white/8 text-white/90 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">T</div>
            <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 max-w-2xl mx-auto w-full">
        <div className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none resize-none text-white placeholder-white/30"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-white/20 text-center mt-2">Press Enter to send</p>
      </div>
    </div>
  );
}
