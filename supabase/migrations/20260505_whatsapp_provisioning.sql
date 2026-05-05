-- WhatsApp auto-provisioning columns
ALTER TABLE tr_agents
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS whatsapp_number_sid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS whatsapp_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(50) DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS whatsapp_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_wa_link TEXT;

CREATE TABLE IF NOT EXISTS tr_phone_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES tr_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES tr_users(id) ON DELETE SET NULL,
  phone_number VARCHAR(50) NOT NULL,
  phone_sid VARCHAR(100),
  country_code VARCHAR(5),
  country_name VARCHAR(100),
  monthly_cost DECIMAL(10,4) DEFAULT 1.00,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
