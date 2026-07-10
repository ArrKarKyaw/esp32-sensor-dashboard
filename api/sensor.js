const { supabase } = require('./db');

module.exports = async (req, res) => {
  // CORS Headers သတ်မှတ်ချက်များ (ESP32 နှင့် Frontend အတွက်)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --------------------------------------------------------
  // 🎯 ၁။ [GET METHOD]: Dashboard UI က ဒေတာအားလုံး လှမ်းတောင်းချိန်
  // --------------------------------------------------------
  if (req.method === 'GET') {
    try {
      // အဆင့် (က) sensor_data ထဲက နောက်ဆုံးရ ဒေတာ ၂၀ ကို အရင်ဆွဲထုတ်ခြင်း
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (sensorError) {
        return res.status(500).json({ error: sensorError.message });
      }

      // 🎯 Frontend ဘက်က JSON Array စစ်စစ် မျှော်လင့်ထားတဲ့အတွက် ရလဒ်ကို တိုက်ရိုက်ပေးပို့ခြင်း
      return res.status(200).json(sensorData || []);
      
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  // --------------------------------------------------------
  // 🎯 ၂။ [POST METHOD]: ESP32 (သို့) Admin Panel က ဒေတာအသစ် လာသိမ်းချိန်
  // --------------------------------------------------------
  if (req.method === 'POST') {
    try {
      // Admin Panel က စက်အသစ်ဆောက်တာလား (device_key ပါလာမလား) စစ်ဆေးခြင်း
      if (req.body.device_key) {
        const { device_key, name } = req.body;
        const { data: devData, error: devError } = await supabase
          .from('devices')
          .insert([{ id: device_key, device_key, name: name || 'ESP32 Device' }])
          .select();

        if (devError) return res.status(400).json({ error: devError.message });
        return res.status(201).json(devData[0]);
      }

      // ESP32 က လှမ်းပို့သည့် Sensor ဒေတာများကို သိမ်းဆည်းခြင်း
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

      const insertData = {
        device_id: device_id, 
        temperature: temperature !== undefined ? parseFloat(temperature) : null,
        humidity: humidity !== undefined ? parseFloat(humidity) : null,
        accel_x: accel_x !== undefined ? parseFloat(accel_x) : null,
        accel_y: accel_y !== undefined ? parseFloat(accel_y) : null,
        accel_z: accel_z !== undefined ? parseFloat(accel_z) : null,
        door_status: door_status || 'Unknown'
      };

      if (pressure !== undefined) {
        insertData.pressure = parseFloat(pressure);
      }

      const { data, error } = await supabase
        .from('sensor_data')
        .insert([insertData])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json(data);

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};