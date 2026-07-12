// ⚙️ ADMIN SETTINGS - USER & DEVICE MANAGEMENT
window.loadSettingsData = async function() {
  const usersTableBody = document.getElementById('users-table-body');
  const devicesTableBody = document.getElementById('devices-table-body');
  const token = localStorage.getItem('token');
  
  // လက်ရှိရွေးချယ်ထားသော ဘာသာစကားကုဒ်ကို ရယူခြင်း (Table တွင်းစာသားများအတွက်)
  const currentLang = document.getElementById('language-select')?.value || 'en';
  
  // Dynamic Table UI စာသားများ သတ်မှတ်ခြင်း
  const deleteBtnText = getTranslation('deleteBtn', currentLang);
  const onlineText = getTranslation('onlineBadge', currentLang);
  const offlineText = getTranslation('offlineBadge', currentLang);
  const unnamedSensorText = getTranslation('unnamedSensor', currentLang);
  const neverText = getTranslation('neverSeen', currentLang);

  try {
    const resUsers = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
    if (resUsers.ok) {
      const users = await resUsers.json();
      if(usersTableBody) {
        usersTableBody.innerHTML = users.map(u => `
          <tr>
            <td>${u.id}</td>
            <td><b>${u.username}</b></td>
            <td><span class="badge badge-${u.role}">${u.role}</span></td>
            <td>
              <button class="button button-danger btn-sm" style="color: #ffffff; background-color: #dc3545;" onclick="deleteUser(${u.id})">
                ${deleteBtnText}
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) { console.error("Error loading users:", err); }

  try {
    const resLogs = await fetch('/api/get-sensor');
    let activeDeviceIds = [];
    if (resLogs.ok) {
      const logs = await resLogs.json();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      activeDeviceIds = logs
        .filter(log => new Date(log.created_at).getTime() > fiveMinutesAgo)
        .map(log => log.device_id || log.ce_id || '');
    }

    const resDevices = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${token}` } });
    if (resDevices.ok) {
      const devices = await resDevices.json();
      if(devicesTableBody) {
        devicesTableBody.innerHTML = devices.map(d => {
          const isOnline = activeDeviceIds.includes(d.device_key || d.id);
          const statusBadge = isOnline 
            ? `<span class="badge" style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">${onlineText}</span>`
            : `<span class="badge" style="background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 4px;">${offlineText}</span>`;

          return `
            <tr>
              <td>${d.id}</td>
              <td><code>${d.device_key || d.id}</code></td>
              <td>${d.name || unnamedSensorText}</td>
              <td>${d.created_at ? new Date(d.created_at).toLocaleString() : neverText}</td>
              <td>${statusBadge}</td>
              <td>
                <button class="button button-danger btn-sm" style="color: #ffffff; background-color: #dc3545;" onclick="deleteDevice('${d.id}')">
                  ${deleteBtnText}
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) { console.error("Error loading devices:", err); }
}

// Event Setup for settings forms (using defer checking inside DOMContentLoaded safe zone)
window.initSettingsEvents = function() {
  const createUserForm = document.getElementById('create-user-form');
  const createDeviceForm = document.getElementById('create-device-form');
  const settingsError = document.getElementById('settings-error');
  const deviceError = document.getElementById('device-error');

  if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('new-username').value.trim();
      const password = document.getElementById('new-password').value;
      const role = document.getElementById('new-role').value;
      const token = localStorage.getItem('token');
      const currentLang = document.getElementById('language-select')?.value || 'en';

      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ username, password, role })
        });
        if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to create user'); }
        createUserForm.reset();
        if (settingsError) { 
          settingsError.textContent = getTranslation('userSuccess', currentLang); 
          settingsError.style.color = "green"; 
          settingsError.classList.remove('hidden'); 
        }
        window.loadSettingsData();
      } catch (err) {
        if (settingsError) { settingsError.textContent = err.message; settingsError.style.color = "red"; settingsError.classList.remove('hidden'); }
      }
    });
  }

  if (createDeviceForm) {
    createDeviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const deviceKey = document.getElementById('new-device-key').value.trim();
      const name = document.getElementById('new-device-name').value.trim();
      const token = localStorage.getItem('token');
      const currentLang = document.getElementById('language-select')?.value || 'en';

      try {
        const response = await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ deviceKey, name })
        });
        if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to create device'); }
        createDeviceForm.reset();
        if (deviceError) { 
          deviceError.textContent = getTranslation('deviceSuccess', currentLang); 
          deviceError.style.color = "green"; 
          deviceError.classList.remove('hidden'); 
        }
        window.loadSettingsData();
      } catch (err) {
        if (deviceError) { deviceError.textContent = err.message; deviceError.style.color = "red"; deviceError.classList.remove('hidden'); }
      }
    });
  }
};

window.deleteUser = async (id) => {
  const currentLang = document.getElementById('language-select')?.value || 'en';
  if(!confirm(getTranslation('confirmDeleteUser', currentLang))) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/users?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  window.loadSettingsData();
};

window.deleteDevice = async (id) => {
  const currentLang = document.getElementById('language-select')?.value || 'en';
  if(!confirm(getTranslation('confirmDeleteDevice', currentLang))) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/devices?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  window.loadSettingsData();
};

// ⚙️ Dynamic Table & Confirmation Alerts i18n Dictionary
const internalSettingsDictionary = {
  en: {
    deleteBtn: "Delete", onlineBadge: "Online", offlineBadge: "Offline", unnamedSensor: "Unnamed Sensor", neverSeen: "Never",
    userSuccess: "Account created successfully!", deviceSuccess: "Device registered successfully!",
    confirmDeleteUser: "Are you sure to delete this user account?", confirmDeleteDevice: "Are you sure to delete this device?"
  },
  my: {
    deleteBtn: "ပယ်ဖျက်ရန်", onlineBadge: "အွန်လိုင်း", offlineBadge: "အော့ဖ်လိုင်း", unnamedSensor: "အမည်မသိ ဆင်ဆာ", neverSeen: "မရှိသေးပါ",
    userSuccess: "အကောင့်အသစ် အောင်မြင်စွာ တည်ဆောက်ပြီးပါပြီ။", deviceSuccess: "ESP32 စက်ပစ္စည်း အောင်မြင်စွာ မှတ်ပုံတင်ပြီးပါပြီ။",
    confirmDeleteUser: "ဤအသုံးပြုသူအကောင့်ကို ဖျက်ရန် သေချာပါသလား။", confirmDeleteDevice: "ဤ ESP32 စက်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား။"
  },
  th: {
    deleteBtn: "ลบ", onlineBadge: "ออนไลน์", offlineBadge: "ออฟไลน์", unnamedSensor: "เซ็นเซอร์ไม่มีชื่อ", neverSeen: "ไม่เคย",
    userSuccess: "สร้างบัญชีสำเร็จแล้ว!", deviceSuccess: "ลงทะเบียนอุปกรณ์สำเร็จแล้ว!",
    confirmDeleteUser: "คุณแน่ใจหรือไม่ที่จะลบ บัญชีผู้ใช้นี้?", confirmDeleteDevice: "คุณแน่ใจหรือไม่ที่จะลบ อุปกรณ์นี้?"
  },
  zh: {
    deleteBtn: "删除", onlineBadge: "在线", offlineBadge: "离线", unnamedSensor: "未命名传感器", neverSeen: "从未",
    userSuccess: "账户创建成功！", deviceSuccess: "设备注册成功！",
    confirmDeleteUser: "您确定要删除此用户账户吗？", confirmDeleteDevice: "您确定要删除此设备吗？"
  },
  vi: {
    deleteBtn: "Xóa", onlineBadge: "Trực tuyến", offlineBadge: "Ngoại tuyến", unnamedSensor: "Cảm biến chưa đặt tên", neverSeen: "Chưa bao giờ",
    userSuccess: "Tạo tài khoản thành công!", deviceSuccess: "Đăng ký thiết bị thành công!",
    confirmDeleteUser: "Bạn có chắc chắn muốn xóa tài khoản người dùng này không?", confirmDeleteDevice: "Bạn có chắc chắn muốn xóa thiết bị này không?"
  }
};

// Helper function to fetch internal translations easily
function getTranslation(key, lang) {
  const targetLang = internalSettingsDictionary[lang] || internalSettingsDictionary['en'];
  return targetLang[key] || internalSettingsDictionary['en'][key];
}

// 🔐 Static Text Elements i18n Sync (For Table Headers & Form Static Labels)
const staticSettingsLanguages = {
  en: {
    thId: "ID", thKey: "Key", thName: "Name", thLastSeen: "Last Seen", thStatus: "Status", thActions: "Actions", thRole: "Role", thUsername: "Username",
    lblEmail: "Email (optional for local DB, required for Supabase)", lblUser: "Username", lblPass: "Password", lblRole: "Role", btnCreateAcc: "Create Account",
    h2EspConfig: "ESP32 Device Settings", pEspConfig: "Register or rename ESP32 devices, and track status from each unit.",
    lblDevKey: "Device Key", lblDevName: "Device Name", btnCreateDev: "Create Device",
    h2RegDev: "Registered ESP32 Devices", h2ExistAcc: "Existing accounts"
  },
  my: {
    thId: "စဉ်", thKey: "ကီး (Key)", thName: "အမည်", thLastSeen: "နောက်ဆုံးချိတ်ဆက်မှု", thStatus: "အခြေအနေ", thActions: "လုပ်ဆောင်ချက်", thRole: "အခန်းကဏ္ဍ", thUsername: "အသုံးပြုသူအမည်",
    lblEmail: "အီးမေးလ် (Local DB အတွက် မလိုပါ၊ Supabase အတွက် လိုအပ်ပါသည်)", lblUser: "အသုံးပြုသူအမည်", lblPass: "စကားဝှက်", lblRole: "အခန်းကဏ္ဍ", btnCreateAcc: "အကောင့်အသစ်ပြုလုပ်မည်",
    h2EspConfig: "ESP32 စက်ပစ္စည်း ပြင်ဆင်ချက်များ", pEspConfig: "ESP32 စက်ပစ္စည်းများကို မှတ်ပုံတင်ခြင်း၊ အမည်ပြောင်းလဲခြင်းနှင့် အခြေအနေများကို စောင့်ကြည့်ခြင်း။",
    lblDevKey: "စက်ပစ္စည်း ကီး (Device Key)", lblDevName: "စက်ပစ္စည်း အမည်", btnCreateDev: "စက်ပစ္စည်းအသစ် ထည့်သွင်းမည်",
    h2RegDev: "မှတ်ပုံတင်ထားသော ESP32 စက်ပစ္စည်းများ", h2ExistAcc: "လက်ရှိအသုံးပြုသူ အကောင့်များ"
  },
  th: {
    thId: "ลำดับ", thKey: "คีย์", thName: "ชื่อ", thLastSeen: "เห็นล่าสุด", thStatus: "สถานะ", thActions: "การกระทำ", thRole: "บทบาท", thUsername: "ชื่อผู้ใช้",
    lblEmail: "อีเมล (ไม่จำเป็นสำหรับ local DB, จำเป็นสำหรับ Supabase)", lblUser: "ชื่อผู้ใช้", lblPass: "รหัสผ่าน", lblRole: "บทบาท", btnCreateAcc: "สร้างบัญชี",
    h2EspConfig: "การตั้งค่าอุปกรณ์ ESP32", pEspConfig: "ลงทะเบียนหรือเปลี่ยนชื่ออุปกรณ์ ESP32 และติดตามสถานะจากแต่ละเครื่อง",
    lblDevKey: "คีย์อุปกรณ์", lblDevName: "ชื่ออุปกรณ์", btnCreateDev: "สร้างอุปกรณ์",
    h2RegDev: "อุปกรณ์ ESP32 ที่ลงทะเบียนแล้ว", h2ExistAcc: "บัญชีที่มีอยู่"
  },
  zh: {
    thId: "ID", thKey: "键值", thName: "名称", thLastSeen: "最后在线", thStatus: "状态", thActions: "操作", thRole: "角色", thUsername: "用户名",
    lblEmail: "电子邮件 (本地数据库可选，Supabase必填)", lblUser: "用户名", lblPass: "密码", lblRole: "角色", btnCreateAcc: "创建账户",
    h2EspConfig: "ESP32 设备设置", pEspConfig: "注册或重命名 ESP32 设备，并跟踪每个单元的状态。",
    lblDevKey: "设备键", lblDevName: "设备名称", btnCreateDev: "创建设备",
    h2RegDev: "已注册的 ESP32 设备", h2ExistAcc: "现有账户"
  },
  vi: {
    thId: "ID", thKey: "Khóa", thName: "Tên", thLastSeen: "Lần cuối thấy", thStatus: "Trạng thái", thActions: "Hành động", thRole: "Vai trò", thUsername: "Tên đăng nhập",
    lblEmail: "Email (tùy chọn cho DB cục bộ, bắt buộc cho Supabase)", lblUser: "Tên đăng nhập", lblPass: "Mật khẩu", lblRole: "Vai trò", btnCreateAcc: "Tạo tài khoản",
    h2EspConfig: "Cài đặt thiết bị ESP32", pEspConfig: "Đăng ký hoặc đổi tên thiết bị ESP32 và theo dõi trạng thái từ mỗi đơn vị.",
    lblDevKey: "Khóa thiết bị", lblDevName: "Tên thiết bị", btnCreateDev: "Tạo thiết bị",
    h2RegDev: "Thiết bị ESP32 đã đăng ký", h2ExistAcc: "Các tài khoản hiện có"
  }
};

window.addEventListener('languageChanged', (e) => {
  const lang = e.detail.lang.toLowerCase(); // 'EN' -> 'en'
  const dict = staticSettingsLanguages[lang];
  if (!dict) return;

  // 1. Table Headers Static Dynamic Mapping
  const tables = document.querySelectorAll('#settings-view table');
  tables.forEach(table => {
    const headers = table.querySelectorAll('thead th');
    headers.forEach(th => {
      const text = th.textContent.trim().toLowerCase();
      if (text.includes('id')) th.textContent = dict.thId;
      else if (text.includes('key')) th.textContent = dict.thKey;
      else if (text.includes('name')) th.textContent = dict.thName;
      else if (text.includes('last seen')) th.textContent = dict.thLastSeen;
      else if (text.includes('status') || text.includes('temp') || text.includes('hum') || text.includes('pressure')) {
        // dynamic placeholders inside original headings fallback
        if(text === 'status') th.textContent = dict.thStatus;
      }
      else if (text.includes('action')) th.textContent = dict.thActions;
      else if (text.includes('role')) th.textContent = dict.thRole;
      else if (text.includes('username')) th.textContent = dict.thUsername;
    });
  });

  // 2. Form Labels & Headings Dynamic DOM mapping
  const labels = document.querySelectorAll('#create-user-form label');
  if(labels[0]) labels[0].childNodes[0].textContent = dict.lblEmail + " ";
  if(labels[1]) labels[1].childNodes[0].textContent = dict.lblUser + " ";
  if(labels[2]) labels[2].childNodes[0].textContent = dict.lblPass + " ";
  if(labels[3]) labels[3].childNodes[0].textContent = dict.lblRole + " ";
  
  const createAccBtn = document.getElementById('create-account-button');
  if(createAccBtn) createAccBtn.textContent = dict.btnCreateAcc;

  // Device Form Section
  const devForm = document.getElementById('create-device-form');
  if(devForm) {
    const devH2 = devForm.previousElementSibling.previousElementSibling;
    if(devH2) devH2.textContent = dict.h2EspConfig;
    const devP = devForm.previousElementSibling;
    if(devP) devP.textContent = dict.pEspConfig;

    const devLabels = devForm.querySelectorAll('label');
    if(devLabels[0]) devLabels[0].childNodes[0].textContent = dict.lblDevKey + " ";
    if(devLabels[1]) devLabels[1].childNodes[0].textContent = dict.lblDevName + " ";
    
    const createDevBtn = devForm.querySelector('button[type="submit"]');
    if(createDevBtn) createDevBtn.textContent = dict.btnCreateDev;
  }

  // Table Section Headings
  const devTableH2 = document.querySelector('#devices-table-body')?.closest('.card')?.querySelector('h2');
  if(devTableH2) devTableH2.textContent = dict.h2RegDev;

  const userTableH2 = document.querySelector('#users-table-body')?.closest('.card')?.querySelector('h2');
  if(userTableH2) userTableH2.textContent = dict.h2ExistAcc;

  // Refresh active loaded table texts instantly
  window.loadSettingsData();
});