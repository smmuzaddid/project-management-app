const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('./supabase');
const { getPromptCache, setPromptCache, getKnowledgeCache, setKnowledgeCache } = require('./redis');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const META_MODEL = process.env.ANTHROPIC_META_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || 'claude-haiku-4-5-20251001';

const META_PROMPT = `You are Transformer, a friendly AI that builds custom AI sales agents for businesses. Ask ONE question at a time. Be warm, concise, exciting.

Use the full conversation history. Never ask again for information the user already gave. If the user gives multiple answers at once, accept them and continue with the next missing item.

Follow this exact order:
1. Ask what type of business they run and what they sell
2. Ask their business name
3. Ask who their typical customers are
4. Ask what the AI should mainly do: (a) Sell products (b) Handle support (c) Both
5. Ask about sales approach: (a) Aggressive — creates urgency, pushes to close fast (b) Soft — friendly, never pushy (c) Consultative — asks questions, gives expert advice
6. Ask what the agent should be called (suggest 2 names)
7. Ask if they have a payment link (Stripe, PayPal etc.)
8. Ask if there is anything special the AI should always do or never do
9. Ask: Which country would you like your WhatsApp number from? Popular options: UAE, USA, UK, Saudi Arabia, Canada, Australia, Germany, India, Pakistan, Singapore. Or type any country.

When you have all info, output ONLY this JSON block — nothing before or after:

\`\`\`json
{
  "ready_to_build": true,
  "business_name": "",
  "business_type": "",
  "business_description": "",
  "target_customers": "",
  "agent_mode": "sales_support",
  "sales_style": "consultative",
  "agent_name": "",
  "payment_link": "",
  "special_instructions": "",
  "whatsapp_country": ""
}
\`\`\``;

const STYLES = {
  aggressive: `SALES STYLE — AGGRESSIVE CLOSER:\n- Create urgency: "Limited spots", "Today only"\n- Ask for commitment early and directly\n- Handle objections firmly\n- End every message pushing toward action`,
  soft: `SALES STYLE — SOFT SELLER:\n- Be helpful, never pushy\n- Let customers lead\n- Focus on education and trust`,
  consultative: `SALES STYLE — CONSULTATIVE:\n- Ask questions before recommending\n- Present 2-3 options with honest pros/cons\n- Guide to right solution`
};

async function metaChat(messages) {
  const res = await client.messages.create({
    model: META_MODEL,
    max_tokens: 500,
    system: [{ type: 'text', text: META_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages
  });
  return res.content[0].text;
}

async function buildSystemPrompt(data) {
  const res = await client.messages.create({
    model: META_MODEL,
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Write a system prompt for an AI agent:\nBusiness: ${data.business_name}\nType: ${data.business_type}\nDescription: ${data.business_description}\nCustomers: ${data.target_customers}\nMode: ${data.agent_mode}\nAgent Name: ${data.agent_name}\nSales Style: ${data.sales_style}\nPayment Link: ${data.payment_link || 'none'}\nSpecial: ${data.special_instructions || 'none'}\n\nThe prompt must:\n1. Define agent as ${data.agent_name} from ${data.business_name}\n2. Set personality for ${data.agent_mode} mode\n3. Include: ${STYLES[data.sales_style] || STYLES.consultative}\n4. Collect name + contact info naturally\n5. Share payment link when customer agrees: ${data.payment_link || 'ask them to contact for payment'}\n6. Use line breaks, no asterisks, emojis ok\n7. Under 600 words\n\nReturn ONLY the system prompt text.`
    }]
  });
  return res.content[0].text;
}

async function buildKnowledge(data) {
  const res = await client.messages.create({
    model: META_MODEL,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Generate 6 knowledge base entries for:\nBusiness: ${data.business_name} — ${data.business_type}\nProducts: ${data.business_description}\nCustomers: ${data.target_customers}\n\nReturn ONLY a JSON array:\n[{"category":"faq","title":"...","content":"..."}]\nCategories: faq, product, policy, about`
    }]
  });
  try { const m = res.content[0].text.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : []; } catch { return []; }
}

async function buildWelcome(data) {
  const res = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Write a 2-sentence welcome for AI agent "${data.agent_name}" at "${data.business_name}" (${data.business_type}). Warm and inviting. Text only.`
    }]
  });
  return res.content[0].text;
}

async function agentChat(agent, messages, memory = null) {
  let systemPrompt = await getPromptCache(agent.id);
  if (!systemPrompt) {
    let knowledge = await getKnowledgeCache(agent.id);
    if (!knowledge) {
      const { data } = await supabase.from('tr_knowledge').select('category, title, content').eq('agent_id', agent.id).eq('is_active', true);
      knowledge = data || [];
      await setKnowledgeCache(agent.id, knowledge);
    }
    const { data: products } = await supabase.from('tr_products').select('name, description, price, currency, payment_link').eq('agent_id', agent.id).eq('is_active', true);
    const kbText = knowledge.length ? '\n\n--- KNOWLEDGE ---\n' + knowledge.map(k => `[${(k.category || 'info').toUpperCase()}] ${k.title}\n${k.content}`).join('\n\n') : '';
    const prodText = products?.length ? '\n\n--- PRODUCTS ---\n' + products.map(p => `${p.name}: ${p.price ? `${p.currency} ${p.price}` : 'Contact for price'}${p.description ? ` — ${p.description}` : ''}${p.payment_link ? ` | Pay: ${p.payment_link}` : ''}`).join('\n') : '';
    const payText = agent.payment_link ? `\n\nPAYMENT: When customer agrees say "${agent.payment_message || 'Here is your payment link:'}" then share: ${agent.payment_link}` : '';
    systemPrompt = `${agent.system_prompt}${payText}${kbText}${prodText}\n\nFORMATTING:\n- Never use ** asterisks **\n- Keep responses under 120 words\n- Use line breaks between sections\n- Use emojis naturally`;
    await setPromptCache(agent.id, systemPrompt);
  }
  let msgs = [...messages];
  if (memory && agent.memory_enabled && msgs.length > 0) {
    const ctx = [];
    if (memory.customer_name) ctx.push(`Customer name: ${memory.customer_name}`);
    if (memory.conversation_count > 0) ctx.push(`Returning customer, visit #${memory.conversation_count + 1}`);
    if (memory.past_purchases?.length) ctx.push(`Past purchases: ${memory.past_purchases.slice(-3).map(p => p.product || p).join(', ')}`);
    if (ctx.length) msgs[0] = { role: msgs[0].role, content: `[CONTEXT — use naturally]\n${ctx.join('\n')}\n\n${msgs[0].content}` };
  }
  const res = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: 400,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: msgs
  });
  const u = res.usage || {};
  const cost = ((u.input_tokens || 0) * 0.00000025) + ((u.cache_read_input_tokens || 0) * 0.000000025) + ((u.output_tokens || 0) * 0.00000125);
  return { text: res.content[0].text, usage: { input: u.input_tokens || 0, cached: u.cache_read_input_tokens || 0, output: u.output_tokens || 0, cost } };
}

async function extractLead(convText) {
  try {
    const res = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: `Extract contact info. Return ONLY JSON or null:\n{"name":null,"email":null,"phone":null,"interest":null,"budget":null}\n\nConversation:\n${convText.slice(-1500)}` }]
    });
    const t = res.content[0].text.trim();
    return t === 'null' ? null : JSON.parse(t);
  } catch { return null; }
}

module.exports = { metaChat, buildSystemPrompt, buildKnowledge, buildWelcome, agentChat, extractLead };
