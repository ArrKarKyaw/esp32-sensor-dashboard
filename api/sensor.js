const { supabase } = require('./db');

module.exports = async (req, res) => {
  // CORS Headers သတ်မှတ်ချက်များ (ESP32 က တိုက်ရိုက်လှမ်းပို့နိုင်ရန်)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    try {
      // ESP32 ဘက်က ပို့လိုက်တဲ့ JSON Body ထဲက ဒေတာများကို ဆွဲထုတ်ခြင်း
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

      // Supabase database ထဲသို့ ထည့်သွင်းမည့် Object တည်ဆောက်ခြင်း
      const insertData = {
        device_id: device_id || "unknown-lift", // 🎯 ဓာတ်လှေကားခွဲခြားရန် ID
        temperature: temperature !== undefined ? parseFloat(temperature) : null,
        humidity: humidity !== undefined ? parseFloat(humidity) : null,
        accel_x: accel_x !== undefined ? parseFloat(accel_x) : null,
        accel_y: accel_y !== undefined ? parseFloat(accel_y) : null,
        accel_z: accel_z !== undefined ? parseFloat(accel_z) : null,
        door_status: door_status || 'Unknown', // 🎯 Door Status သိမ်းခြင်း
        created_at: new Date() // အချိန်မှတ်တမ်း
      };

      // အကယ်၍ လေဖိအား (Pressure) ပါလာလျှင် ထည့်သွင်းသိမ်းဆည်းမည်
      if (pressure !== undefined) {
        insertData.pressure = parseFloat(pressure);
      }

      // Supabase `sensor_data` table ထဲသို့ ဒေတာအသစ် Insert လုပ်ခြင်း
      const { data, error } = await supabase
        .from('sensor_data')
        .insert([insertData])
        .select();

      if (error) {
        console.error("Supabase Insertion Error:", error.message);
        return res.status(400).json({ error: error.message });
      }

      // အောင်မြင်ကြောင်း ESP32 ထံ Response ပြန်ခြင်း
      return res.status(200).json({ 
        message: 'All multi-sensor data saved successfully!', 
        data 
      });

    } catch (err) {
      console.error("Server Catch Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST မဟုတ်ဘဲ အခြား Method များဖြင့် လာခေါ်ပါက ပယ်ချခြင်း
  return res.status(405).json({ error: 'Method not allowed' });
};