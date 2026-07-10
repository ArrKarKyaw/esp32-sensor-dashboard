const { supabase } = require('./db');

module.exports = async (req, res) => {
  // CORS Headers သတ်မှတ်ချက်များ (ESP32 နှင့် Frontend နှစ်ခုလုံး လှမ်းခေါ်နိုင်ရန်)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --------------------------------------------------------
  // 🎯 🎯 [GET METHOD]: Dashboard UI အတွက် စက်စာရင်း ထုတ်ပေးရန်
  // --------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  // --------------------------------------------------------
  // 🎯 🎯 [POST METHOD]: ESP32 ဆီက ဒေတာလက်ခံပြီး သိမ်းရန်
  // --------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const { 
        device_id, 
        temperature, 
        humidity, 
        pressure, 
        accel_x, 
        accel_y, 
        accel_z, 
        door_status 
      } = req.body;

      if (!device_id) {
        return res.status(400).json({ error: "device_id is required" });
      }

      // Supabase table ထဲသို့ ထည့်သွင်းမည့် Object
      const insertData = {
        device_id: device_id, 
        temperature: temperature !== undefined ? parseFloat(temperature) : null,
        humidity: humidity !== undefined ? parseFloat(humidity) : null,
        accel_x: accel_x !== undefined ? parseFloat(accel_x) : null,
        accel_y: accel_y !== undefined ? parseFloat(accel_y) : null,
        accel_z: accel_z !== undefined ? parseFloat(accel_z) : null,
        door_status: door_status || 'Unknown'
        // 🎯 တိုင်ပင်ချက်- created_at ကို ဖယ်ထားပါတယ် (Supabase က အော်တို ထည့်ပေးပါလိမ့်မယ်)
      };

      if (pressure !== undefined) {
        insertData.pressure = parseFloat(pressure);
      }

      // Supabase `sensor_data` table ထဲသို့ ထည့်ခြင်း
      const { data, error } = await supabase
        .from('sensor_data')
        .insert([insertData])
        .select();

      if (error) {
        console.error("Supabase Insertion Error:", error.message);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ 
        message: 'All multi-sensor data saved successfully!', 
        data 
      });

    } catch (err) {
      console.error("Server Catch Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};