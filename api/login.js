const { supabase } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log("TEST: API HIT");
    const { username, password } = req.body;
    console.log("Checking user:", username); 

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(401).json({ error: 'DB Error' });
    }
    
    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 🛠️ အထူးပြင်ဆင်ချက်- Bcrypt ရော Plain Text ပါ နှစ်မျိုးစလုံး စစ်ဆေးနည်း
    let match = false;
    if (password === user.password) {
      match = true; // Supabase ထဲမှာ plain text အတိုင်း admin123 လို့ ရေးထားရင်လည်း ပေးဝင်မယ်
    } else {
      try {
        match = await bcrypt.compare(password, user.password); // Hash ဆိုရင်လည်း စစ်မယ်
      } catch (e) {
        match = false;
      }
    }

    console.log("Password match result:", match);

    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // JWT Secret မရှိရင် 'fallback_secret' ကို သုံးဖို့ ပြင်လိုက်ပါတယ်
    const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role }, 
      secretKey, 
      { expiresIn: '24h' }
    );
    
    return res.status(200).json({ token, username: user.username, role: user.role });

  } catch (err) {
    console.error("Catch Block Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};