// 🔓 CREATE NEW USER (Supabase Table ထဲသို့ အကောင့်အသစ် တိုက်ရိုက်လှမ်းထည့်မည့်စနစ်)
app.post('/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 🚀 ၁။ Password ကို Bcrypt သုံးပြီး လုံခြုံအောင် Hash လုပ်ခြင်း
    const hashed = bcrypt.hashSync(password, 10);

    // 🚀 ၂။ အကယ်၍ Supabase ချိတ်ဆက်ထားတာ ရှိရင် ရိုးရိုး 'users' Table ထဲကို တိုက်ရိုက် Insert လုပ်ပါမယ်
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([
          { username: username, password: hashed, role: role || 'user' }
        ])
        .select();

      // အကောင့်ရှိပြီးသားဖြစ်လို့ (Unique Constraint) ကြောင့် Error တက်ရင်
      if (error) {
        if (error.code === '23505') { // Postgres UNIQUE Violation Code
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

    // --- Fallback (Local SQLite စမ်းသပ်မှုအတွက်) ---
    if (!db) {
      return res.status(501).json({ error: 'Database not available on this platform' });
    }

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