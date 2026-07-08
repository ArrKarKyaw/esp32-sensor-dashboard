const { supabase } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Authorization Token ကို စစ်ဆေးခြင်း
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
    
    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 2. Request Body မှ ဒေတာများ ယူခြင်း
    const { username, email, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 3. Supabase Table ထဲထည့်ရန် ပုံစံပြင်ခြင်း
    const insertData = { 
      username: username, 
      password: password, // login.js အတိုင်း Plain Text အဖြစ်ပဲ အရင်သိမ်းကြည့်ပါမယ်
      role: role ? role.toLowerCase() : 'user' // Admin Form ကလာတဲ့ 'User' ကို 'user' လို့ ပြောင်းပစ်ရန်
    };

    if (email) {
      insertData.email = email;
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([insertData])
      .select();

    if (error) {
      console.error("Supabase Insert Error:", error.message);
      return res.status(400).json({ error: 'Database Error: ' + error.message });
    }

    const createdUser = Array.isArray(newUser) ? newUser[0] : newUser;

    return res.status(201).json({ 
      id: createdUser?.id || Date.now(), 
      username: username, 
      role: role 
    });

  } catch (err) {
    console.error("Catch Block Error in Users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};