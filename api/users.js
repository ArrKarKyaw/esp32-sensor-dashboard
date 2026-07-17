const bcrypt = require('bcryptjs');
const { supabase } = require('./db');
const { requireAuth } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const currentUser = requireAuth(req, res, { roles: ['admin'] });
    if (!currentUser) return;

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

      const normalizedRole = role ? role.toLowerCase() : 'user';
      if (!['admin', 'manager', 'user'].includes(normalizedRole)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertData = { 
        username: username, 
        password: hashedPassword, 
        role: normalizedRole 
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
        role: normalizedRole 
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
