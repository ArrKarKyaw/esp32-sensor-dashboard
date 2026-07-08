const { supabase } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method === 'POST') {
    try {
      const { temperature, humidity, pressure, device_id } = req.body;

      if (temperature === undefined || humidity === undefined) {
        return res.status(400).json({ error: 'Missing temperature or humidity' });
      }

      // သင့် Supabase Table Structure အတိုင်း ကွက်တိ ပြင်ဆင်ခြင်း
      const insertData = {
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        created_at: new Date()
      };

      // တကယ်လို့ ESP32 ဘက်က pressure ပို့ရင် ထည့်မယ်၊ မပို့ရင် null ထားမယ်
      if (pressure !== undefined) {
        insertData.pressure = parseFloat(pressure);
      }

      // device_id က uuid ဖြစ်လို့ ပို့လာရင် ထည့်မယ် (မပို့ရင် null ထားမယ်)
      if (device_id) {
        insertData.device_id = device_id;
      }

      // Supabase ထဲသို့ သိမ်းဆည်းခြင်း
      const { data, error } = await supabase
        .from('sensor_data')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Supabase Insert Error:', error.message);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Sensor data saved successfully!', data });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};