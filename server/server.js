const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const http = require('http').createServer(app);

// 🚀 Vercel (Serverless) မှာ socket.io ကို ပုံမှန်အတိုင်း configuration လုပ်ပေးခြင်း
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_elevator_secret_key_123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// 🚀 Vercel 500 Error အမြစ်ပြတ်စေရန် SQLite ကို အွန်လိုင်းပေါ်မှာ လုံးဝ ခေါ်မသုံးတော့ဘဲ ကျော်ခိုင်းခြင်း
let db;
try {
  // Local စက်ထဲမှာပဲ SQLite သုံးပြီး Vercel ပေါ်ရောက်ရင် crash မဖြစ်အောင် တားဆီးခြင်း
  if (process.env.VERCEL !== '1') {
    const { db: localDb } = require('./db');
    db = localDb;
  }
} catch (e) {
  console.log("Database features disabled on serverless platform.");
}

// 🔓 LOGIN ROUTE (ဒေတာဘေ့စ်မလိုဘဲ တန်းပွင့်မည့်စနစ်)
app.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { sub: 1, username: 'admin', role: 'admin' }, 
        JWT_SECRET, 
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
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// Socket.io Connection Dummy Handler for Vercel
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start Server
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});