// ၁။ လိုအပ်သော Modules များ ခေါ်ယူခြင်း
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // 🔥 bcrypt နေရာမှာ bcryptjs သို့ ပြောင်းလိုက်ပါပြီ
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// ၂။ Express App Initialize လုပ်ခြင်း
const app = express();

// Middleware များ သတ်မှတ်ခြင်း
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

// ၃။ Supabase Admin Client ချိတ်ဆက်ခြင်း
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Supabase Admin initialized successfully!");
} else {
  console.log("Warning: Supabase credentials missing from Environment Variables.");
}

// ၄။ LOGIN ENDPOINT
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Database connection is not configured.' });
    }

    // Supabase 'users' Table ထဲမှာ user ကို ရှာခြင်း
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Password ကို Bcryptjs ဖြင့် စစ်ဆေးခြင်း
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // JWT Token ထုတ်ပေးခြင်း
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// ၅။ CREATE USER ENDPOINT
app.post('/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashed = bcrypt.hashSync(password, 10);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([
          { username: username, password: hashed, role: role || 'user' }
        ])
        .select();

      if (error) {
        if (error.code === '23505') { 
          return res.status(409).json({ error: 'User already exists' });
        }
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ 
        id: data[0]?.id || null, 
        username, 
        role: role || 'user' 
      });
    }

    return res.status(501).json({ error: 'Database service unavailable' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// Vercel Serverless Function အဖြစ် သုံးနိုင်ရန် Export လုပ်ခြင်း
module.exports = app;