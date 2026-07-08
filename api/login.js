// 1. လိုအပ်တဲ့ Modules များကို ခေါ်ယူခြင်း
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 2. Database ချိတ်ဆက်ခြင်း (Environment Variables ကို သုံးပါ)
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 3. Vercel Serverless Function Handler
module.exports = async (req, res) => {
  // CORS သတ်မှတ်ချက် (API အဆင်ပြေပြေ ချိတ်ဆက်နိုင်ရန်)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body;

    // Supabase မှ User ကို ရှာဖွေခြင်း
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    // Password စစ်ဆေးခြင်း
    if (error || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // JWT Token ထုတ်ပေးခြင်း
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    return res.status(200).json({ token, username: user.username, role: user.role });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};