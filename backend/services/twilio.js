const twilio = require('twilio');
const QRCode = require('qrcode');
let client = null;

function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

const COUNTRY_CODES = {
  'UAE': 'AE', 'United Arab Emirates': 'AE',
  'USA': 'US', 'United States': 'US',
  'UK': 'GB', 'United Kingdom': 'GB',
  'Saudi Arabia': 'SA', 'KSA': 'SA',
  'Canada': 'CA', 'Australia': 'AU',
  'Germany': 'DE', 'France': 'FR',
  'India': 'IN', 'Pakistan': 'PK',
  'Singapore': 'SG', 'Netherlands': 'NL',
  'Spain': 'ES', 'Italy': 'IT',
  'Brazil': 'BR', 'Mexico': 'MX',
  'Egypt': 'EG', 'Jordan': 'JO',
  'Kuwait': 'KW', 'Qatar': 'QA',
  'Bahrain': 'BH', 'Oman': 'OM',
  'Nigeria': 'NG', 'Kenya': 'KE'
};

async function searchAvailableNumbers(countryCode) {
  const c = getClient();
  if (!c) throw new Error('Twilio not configured');
  try {
    const numbers = await c.availablePhoneNumbers(countryCode).local.list({ smsEnabled: true, limit: 5 });
    if (numbers.length > 0) return numbers;
    const tollFree = await c.availablePhoneNumbers(countryCode).tollFree.list({ limit: 5 }).catch(() => []);
    if (tollFree.length > 0) return tollFree;
    return await c.availablePhoneNumbers('US').local.list({ limit: 3 });
  } catch (err) {
    console.error('Number search error:', err.message);
    return await c.availablePhoneNumbers('US').local.list({ limit: 3 }).catch(() => []);
  }
}

async function provisionWhatsAppNumber(phoneNumber, agentId) {
  const c = getClient();
  if (!c) throw new Error('Twilio not configured');
  const webhookUrl = (process.env.APP_URL || 'http://localhost:5001') + '/api/whatsapp/incoming';
  const purchased = await c.incomingPhoneNumbers.create({
    phoneNumber,
    smsUrl: webhookUrl,
    smsMethod: 'POST',
    friendlyName: 'Transformer Agent ' + agentId
  });
  return { sid: purchased.sid, phoneNumber: purchased.phoneNumber };
}

async function releaseNumber(sid) {
  const c = getClient();
  if (!c) return;
  try { await c.incomingPhoneNumbers(sid).remove(); } catch (e) { console.error('Release error:', e.message); }
}

async function sendWhatsApp(from, to, message) {
  const c = getClient();
  if (!c) throw new Error('Twilio not configured');
  const toFmt = to.startsWith('whatsapp:') ? to : 'whatsapp:' + to;
  const fromFmt = from.startsWith('whatsapp:') ? from : 'whatsapp:' + from;
  return await c.messages.create({ from: fromFmt, to: toFmt, body: message });
}

async function sendWhatsAppSandbox(to, message) {
  const c = getClient();
  if (!c) throw new Error('Twilio not configured');
  const toFmt = to.startsWith('whatsapp:') ? to : 'whatsapp:' + to;
  return await c.messages.create({
    from: 'whatsapp:' + process.env.TWILIO_SANDBOX_NUMBER,
    to: toFmt,
    body: message
  });
}

async function generateDedicatedQR(phoneNumber) {
  const num = phoneNumber.replace('+', '').replace(/\s/g, '');
  const waLink = 'https://wa.me/' + num;
  const qr = await QRCode.toDataURL(waLink);
  return { qr, waLink, phoneNumber };
}

async function generateSandboxQR(sandboxCode) {
  const num = (process.env.TWILIO_SANDBOX_NUMBER || '').replace('+', '');
  const waLink = 'https://wa.me/' + num + '?text=' + encodeURIComponent(sandboxCode);
  const qr = await QRCode.toDataURL(waLink);
  return { qr, waLink, sandboxCode };
}

function parseIncoming(body) {
  return {
    from: (body.From || '').replace('whatsapp:', ''),
    to: (body.To || '').replace('whatsapp:', ''),
    message: body.Body || '',
    profileName: body.ProfileName || null
  };
}

module.exports = {
  getClient, COUNTRY_CODES,
  searchAvailableNumbers, provisionWhatsAppNumber, releaseNumber,
  sendWhatsApp, sendWhatsAppSandbox,
  generateDedicatedQR, generateSandboxQR,
  parseIncoming
};
