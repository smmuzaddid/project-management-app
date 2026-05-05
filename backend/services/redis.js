const { Redis } = require('@upstash/redis');

let redis = null;
const memoryStore = new Map();
const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;
if (redisUrl && redisUrl.startsWith('https://') && redisToken && redisToken !== 'FILL_THIS') {
  try { redis = new Redis({ url: redisUrl, token: redisToken }); } catch (e) { console.warn('Redis init failed:', e.message); }
} else {
  console.warn('Redis not configured — running without cache/sessions (set UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN)');
}

const parseStored = (value) => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

const memoryGet = (key) => {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return parseStored(item.value);
};

const memorySet = (key, ttl, value) => {
  memoryStore.set(key, {
    value,
    expiresAt: ttl ? Date.now() + ttl * 1000 : null
  });
};

const rget = async (key) => {
  if (!redis) return memoryGet(key);
  try { const d = await redis.get(key); return d ? parseStored(d) : null; } catch { return memoryGet(key); }
};
const rsetex = async (key, ttl, val) => {
  if (!redis) {
    memorySet(key, ttl, val);
    return;
  }
  try { await redis.setex(key, ttl, val); } catch { memorySet(key, ttl, val); }
};
const rdel = async (key) => {
  memoryStore.delete(key);
  if (!redis) return;
  try { await redis.del(key); } catch {}
};
const rincr = async (key) => { if (!redis) return 1; try { return await redis.incr(key); } catch { return 1; } };
const rexpire = async (key, ttl) => { if (!redis) return; try { await redis.expire(key, ttl); } catch {} };

async function getMemory(agentId, customerId) {
  return rget(`mem:${agentId}:${customerId}`);
}
async function saveMemory(agentId, customerId, updates) {
  try {
    const e = await getMemory(agentId, customerId) || {};
    const u = { ...e, ...updates, updated_at: new Date().toISOString() };
    await rsetex(`mem:${agentId}:${customerId}`, 86400 * 30, JSON.stringify(u));
    return u;
  } catch { return updates; }
}
async function getSession(sid) {
  const d = await rget(`sess:${sid}`);
  return d || [];
}
async function saveSession(sid, messages) {
  await rsetex(`sess:${sid}`, 86400, JSON.stringify(messages.slice(-20)));
}
async function getBuildSession(sid) {
  return await rget(`build:${sid}`) || null;
}
async function saveBuildSession(sid, session) {
  await rsetex(`build:${sid}`, 86400, JSON.stringify({
    ...session,
    messages: (session.messages || []).slice(-30),
    updated_at: new Date().toISOString()
  }));
}
async function getPromptCache(agentId) {
  return rget(`prompt:${agentId}`);
}
async function setPromptCache(agentId, prompt) {
  await rsetex(`prompt:${agentId}`, 3600, prompt);
}
async function clearCache(agentId) {
  await Promise.allSettled([rdel(`prompt:${agentId}`), rdel(`knowledge:${agentId}`)]);
}
async function getKnowledgeCache(agentId) {
  return rget(`knowledge:${agentId}`);
}
async function setKnowledgeCache(agentId, k) {
  await rsetex(`knowledge:${agentId}`, 3600, JSON.stringify(k));
}
async function rateLimit(key, max = 20) {
  try {
    const c = await rincr(`rate:${key}`);
    if (c === 1) await rexpire(`rate:${key}`, 60);
    return c <= max;
  } catch { return true; }
}

module.exports = {
  getMemory,
  saveMemory,
  getSession,
  saveSession,
  getBuildSession,
  saveBuildSession,
  getPromptCache,
  setPromptCache,
  clearCache,
  getKnowledgeCache,
  setKnowledgeCache,
  rateLimit
};
