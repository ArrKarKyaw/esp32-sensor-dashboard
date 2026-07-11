const { supabase } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // URL Query Parameters ကနေ Filter လုပ်မယ့်အချက်အလက်တွေကို ဖတ်ခြင်း
  const { deviceId, startDate, endDate } = req.query;

  try {
    let query = supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false });

    // ၁။ Device ID ရွေးထားရင် စစ်ထုတ်မည်
    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    // ၂။ Start Date ပါလာရင် ၎င်းနေ့ရက် မနက် 00:00:00 က စပြီး ယူမည်
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }

    // ၃။ End Date ပါလာရင် ၎င်းနေ့ရက် ညဉ့်နက်ပိုင်း 23:59:59 အထိ ယူမည်
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // ၄။ အကယ်၍ ရက်စွဲ Filter မပါလာမှသာ (Live Dashboard အတွက်) နောက်ဆုံးဒေတာ အခု ၂၀ သာ ကန့်သတ်ယူမည်
    if (!startDate && !endDate) {
      query = query.limit(20);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};