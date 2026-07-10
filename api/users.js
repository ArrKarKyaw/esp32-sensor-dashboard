const { supabase } = require('./db');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 🔐 ၁။ Authorization Token စစ်ဆေးခြင်း (GET, POST, DELETE အားလုံးအတွက်)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
    
    try {
      jwt.verify(token, secretKey);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // --------------------------------------------------------
    // 🎯 [GET METHOD]: Existing Accounts စာရင်းထုတ်ပေးရန်
    // --------------------------------------------------------
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role')
        .order('id', { ascending: true });

      if (error) {
        return res.status(400).json({ error: 'Database Error: ' + error.message });
      }
      return res.status(200).json(data || []);
    }

    // --------------------------------------------------------
    // 🎯 [POST METHOD]: ကိုအာကာ့ရဲ့ မူလကုဒ်အတိုင်း အကောင့်အသစ်ဆောက်ရန်
    // --------------------------------------------------------
    if (req.method === 'POST') {
      const { username, email, password, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const insertData = { 
        username: username, 
        password: password, 
        role: role ? role.toLowerCase() : 'user' 
      };

      if (email) insertData.email = email;

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
    }

    // --------------------------------------------------------
    // 🎯 [DELETE METHOD]: Admin Panel ကနေ အကောင့်ဖျက်ရန်
    // --------------------------------------------------------
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'User ID is required' });

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: 'Database Error: ' + error.message });
      }
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }

  } catch (err) {
    console.error("Catch Block Error in Users:", err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};