const { supabase } = require('./db');
const { normalizeDevicePayload, normalizeSensorPayload, normalizeSensorRecord } = require('./_lib/contracts');

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
      const normalizedDevice = normalizeDevicePayload(req.body);

      // Backward-compatible device registration handling.
      if (normalizedDevice.device_key && req.body.temperature === undefined && req.body.humidity === undefined && req.body.pressure === undefined) {
        const { data: devData, error: devError } = await supabase
          .from('devices')
          .insert([{
            id: normalizedDevice.device_key,
            device_key: normalizedDevice.device_key,
            name: normalizedDevice.name,
          }])
          .select();

        if (devError) return res.status(400).json({ error: devError.message });
        return res.status(201).json(devData[0]);
      }

      const normalizedSensor = normalizeSensorPayload(req.body);

      if (!normalizedSensor.device_id) {
        return res.status(400).json({ error: "device_id is required" });
      }

      const insertData = {
        device_id: normalizedSensor.device_id,
        temperature: normalizedSensor.temperature,
        humidity: normalizedSensor.humidity,
        accel_x: normalizedSensor.accel_x,
        accel_y: normalizedSensor.accel_y,
        accel_z: normalizedSensor.accel_z,
        door_status: normalizedSensor.door_status,
      };

      if (normalizedSensor.pressure !== null) {
        insertData.pressure = normalizedSensor.pressure;
      }

      const { data, error } = await supabase
        .from('sensor_data')
        .insert([insertData])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json((data || []).map(normalizeSensorRecord));

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
