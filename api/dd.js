require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';
const supabaseUrl = process.env.SUPABASE_URL;

// 🚀 Vercel Settings ထဲက SUPABASE_KEY သို့မဟုတ် SERVICE_ROLE_KEY နှစ်ခုလုံးကို သိနိုင်အောင် ညှိထားခြင်း
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (supabaseUrl && supabaseKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey);
}

// 🎯 LOGIN ENDPOINT
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Database connection is not configured on Vercel. Keys might be missing.' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      { key: JWT_SECRET }.key, // Vercel Option ကာကွယ်ရန်
      { expiresIn: '24h' }
    );

    return res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// 🎯 CREATE USER ENDPOINT
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
        .insert([{ username, password: hashed, role: role || 'user' }])
        .select();

      if (error) {
        if (error.code === '23505') { 
          return res.status(409).json({ error: 'User already exists' });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json({ id: data[0]?.id || null, username, role: role || 'user' });
    }
    return res.status(501).json({ error: 'Database service unavailable' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// 🚀 Local ဆော့တဲ့အခါ အဆင်ပြေအောင် listen လုပ်ခိုင်းထားပြီး Vercel အတွက် Export ထုတ်ခြင်း
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

//module.exports = app;
const serverless = require('serverless-http');
module.exports = serverless(app);