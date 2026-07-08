const { supabase } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body;
    
    // ဒီနေရာမှာ Log စစ်ပါ
    console.log("Checking user:", username); 

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      // Supabase ဘက်က Error တက်ရင် ဒီနေရာမှာ ပေါ်လာပါမယ်
      console.error("Supabase Error:", error.message);
      return res.status(401).json({ error: 'DB Error: ' + error.message });
    }
    
    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    
    // Password match ဖြစ်မဖြစ် စစ်ပါ
    console.log("Password match result:", match);

    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.status(200).json({ token, username: user.username, role: user.role });

  } catch (err) {
    // တခြား Server Error တွေအတွက်
    console.error("Catch Block Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};