const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

let supabaseAdmin = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase admin client initialized');
  } catch (e) {
    console.warn('Failed to initialize Supabase client:', e.message);
  }
}

const app = express();

// 🚀 Vercel (Serverless) လမ်းကြောင်းတည့်အောင် HTTP Server ဆောက်ပြီး Export လုပ်ပေးရပါမယ်
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// 🚀 SQLite Fallback စစ်ဆေးခြင်း
let db;
try {
  if (process.env.VERCEL !== '1') {
    const { db: localDb } = require('./db');
    db = localDb;
  }
} catch (e) {
  console.log("Database features disabled on serverless platform.");
}

// 🔓 LOGIN ROUTE (Vercel ပေါ်မှာ တိုက်ရိုက်အလုပ်လုပ်မည့် POST စနစ်)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // 🚀 အွန်လိုင်း Vercel ပေါ်မှာ ဒေတာဘေ့စ်မလိုဘဲ တန်းဝင်နိုင်အောင် အသေပေးထားခြင်း
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { sub: 1, username: 'admin', role: 'admin' }, 
      process.env.JWT_SECRET || 'fallback_secret_key_123', 
      { expiresIn: '12h' }
    );
    
    return res.json({ 
      id: 1, 
      token, 
      username: 'admin', 
      role: 'admin' 
    });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

// Create new user
app.post('/users', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (supabaseAdmin) {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required when using Supabase' });
      }

      const createOpts = {
        email,
        password,
        user_metadata: { username: username || null, role: role || 'user' }
      };

      const { data, error } = await supabaseAdmin.auth.admin.createUser(createOpts).catch((e) => ({ error: e }));

      if (error) {
        return res.status(500).json({ error: error.message || JSON.stringify(error) });
      }

      return res.status(201).json({ id: data?.user?.id || null, email, username: username || null, role: role || 'user' });
    }

    if (!db) {
      return res.status(501).json({ error: 'Database not available on this platform' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashed = bcrypt.hashSync(password, 10);

    db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashed, role || 'user'],
      function (err) {
        if (err) {
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'User already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        return res.status(201).json({ id: this.lastID, username, role: role || 'user' });
      }
    );
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ⚡ Local စက်ထဲမှာ Run ရင် အလုပ်လုပ်ပြီး Vercel ပေါ်မှာဆိုရင် လမ်းကြောင်းမပိတ်အောင် ခွဲထုတ်ခြင်း
if (process.env.VERCEL !== '1') {
  http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// 🎯 Vercel Cloud စနစ်က လှမ်းခေါ်လို့ရအောင် app (Express) ကို အဓိက Export ထုတ်ပေးရပါမယ်
module.exports = app;