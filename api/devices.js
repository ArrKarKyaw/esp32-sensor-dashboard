const { supabase } = require('./db');
const { requireAuth } = require('./_lib/auth');
const { normalizeDevicePayload } = require('./_lib/contracts');

// Vercel သေချာပေါက် ဖတ်လို့ရမည့် Standard Function Export 
async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowedRoles = ['admin', 'manager'];
  const currentUser = requireAuth(req, res, { roles: allowedRoles });
  if (!currentUser) return;

  // 🎯 ၁။ [GET METHOD]: စက်ပစ္စည်းစာရင်း တောင်းခြင်း
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*');
      
      if (error) {
        console.error("Supabase GET Devices Error:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 🎯 ၂။ [POST METHOD]: စက်အသစ်ဆောက်ခြင်း
  if (req.method === 'POST') {
    try {
      const normalizedDevice = normalizeDevicePayload(req.body);
      if (!normalizedDevice.device_key) return res.status(400).json({ error: "deviceKey is required" });

      const { data, error } = await supabase
        .from('devices')
        .insert([{ 
          id: normalizedDevice.device_key,
          device_key: normalizedDevice.device_key,
          name: normalizedDevice.name || 'Main Lobby Sensor' 
        }])
        .select();

      if (error) {
        console.error("Supabase POST Device Error:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.status(201).json(data[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 🎯 ၃။ [DELETE METHOD]: စက်ပစ္စည်းဖျက်ခြင်း
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Device ID is required" });

      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Supabase DELETE Device Error:", error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// 🎯 အဓိက အရေးကြီးဆုံး နေရာ (Vercel သိအောင် အသေအချာ Export ထုတ်ခြင်း)
module.exports = handler;
