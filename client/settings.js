// ⚙️ ADMIN SETTINGS - USER & DEVICE MANAGEMENT
window.loadSettingsData = async function() {
  const usersTableBody = document.getElementById('users-table-body');
  const devicesTableBody = document.getElementById('devices-table-body');
  const token = localStorage.getItem('token');

  if (!token) {
    window.appState.setRegisteredDevices([]);
    if (usersTableBody) usersTableBody.innerHTML = '';
    if (devicesTableBody) devicesTableBody.innerHTML = '';
    return;
  }
  
  // လက်ရှိရွေးချယ်ထားသော ဘာသာစကားကုဒ်ကို ရယူခြင်း
  const currentLang = document.getElementById('language-select')?.value || 'en';
  
  // Dynamic Table UI စာသားများ သတ်မှတ်ခြင်း (Centralized getTranslation စနစ်ကို သုံးသည်)
  const deleteBtnText = getTranslation('deleteBtn', currentLang);
  const onlineText = getTranslation('onlineBadge', currentLang);
  const offlineText = getTranslation('offlineBadge', currentLang);
  const unnamedSensorText = getTranslation('unnamedSensor', currentLang);
  const neverText = getTranslation('neverSeen', currentLang);

  try {
    // Vercel Path Safe: api/users
    const resUsers = await fetch('api/users', { headers: { 'Authorization': `Bearer ${token}` } });
    if (resUsers.ok) {
      const users = await resUsers.json();
      if(usersTableBody) {
        usersTableBody.innerHTML = users.map(u => {
          // Role များကို i18n အလိုက် ဘာသာပြန်ခြင်း
          let roleText = u.role || 'user';
          if (roleText === 'admin') roleText = getTranslation('roleAdmin', currentLang);
          else if (roleText === 'manager') roleText = getTranslation('roleManager', currentLang);
          else if (roleText === 'user') roleText = getTranslation('roleUser', currentLang);

          return `
            <tr>
              <td>${u.id}</td>
              <td><b>${u.username}</b></td>
              <td><span class="badge badge-${u.role}">${roleText}</span></td>
              <td>
                <button class="button button-danger btn-sm" style="color: #ffffff; background-color: #dc3545;" onclick="deleteUser(${u.id})">
                  ${deleteBtnText}
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) { console.error("Error loading users:", err); }

  try {
    // Vercel Path Safe: api/get-sensor
    const resLogs = await fetch('api/get-sensor');
    let activeDeviceIds = [];
    if (resLogs.ok) {
      const logs = await resLogs.json();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      activeDeviceIds = logs
        .filter(log => new Date(log.created_at).getTime() > fiveMinutesAgo)
        .map(log => window.appState.getDeviceId(log));
    }

    // Vercel Path Safe: api/devices
    const resDevices = await fetch('api/devices', { headers: { 'Authorization': `Bearer ${token}` } });
    if (resDevices.ok) {
      const devices = await resDevices.json();
      window.appState.setRegisteredDevices(devices);
      if(devicesTableBody) {
        devicesTableBody.innerHTML = devices.map(d => {
          const deviceKey = window.appState.getDeviceKey(d);
          const isOnline = activeDeviceIds.includes(deviceKey);
          const statusBadge = isOnline 
            ? `<span class="badge" style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">${onlineText}</span>`
            : `<span class="badge" style="background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 4px;">${offlineText}</span>`;

          return `
            <tr>
              <td>${d.id}</td>
              <td><code style="color: #01919d; font-weight: bold;">${deviceKey}</code></td>
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

// Event Setup for settings forms
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
        const response = await fetch('api/users', {
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
        const response = await fetch('api/devices', {
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
  await fetch(`api/users?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  window.loadSettingsData();
};

window.deleteDevice = async (id) => {
  const currentLang = document.getElementById('language-select')?.value || 'en';
  if(!confirm(getTranslation('confirmDeleteDevice', currentLang))) return;
  const token = localStorage.getItem('token');
  await fetch(`api/devices?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  window.loadSettingsData();
};

// ⚙️ Local Backup Dictionary (language.json မတက်လာပါက အရန်သုံးရန်)
const internalSettingsDictionary = {
  en: {
    deleteBtn: "Delete", onlineBadge: "Online", offlineBadge: "Offline", unnamedSensor: "Unnamed Sensor", neverSeen: "Never",
    userSuccess: "Account created successfully!", deviceSuccess: "Device registered successfully!",
    confirmDeleteUser: "Are you sure to delete this user account?", confirmDeleteDevice: "Are you sure to delete this device?",
    roleAdmin: "Admin", roleManager: "Manager", roleUser: "User"
  },
  my: {
    deleteBtn: "ပယ်ဖျက်ရန်", onlineBadge: "အွန်လိုင်း", offlineBadge: "အော့ဖ်လိုင်း", unnamedSensor: "အမည်မသိ ဆင်ဆာ", neverSeen: "မရှိသေးပါ",
    userSuccess: "အကောင့်အသစ် အောင်မြင်စွာ တည်ဆောက်ပြီးပါပြီ။", deviceSuccess: "ESP32 စက်ပစ္စည်း အောင်မြင်စွာ မှတ်ပုံတင်ပြီးပါပြီ။",
    confirmDeleteUser: "ဤအသုံးပြုသူအကောင့်ကို ဖျက်ရန် သေချာပါသလား။", confirmDeleteDevice: "ဤ ESP32 စက်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား။",
    roleAdmin: "အက်ဒမင်", roleManager: "မန်နေဂျာ", roleUser: "အသုံးပြုသူ"
  },
  th: {
    deleteBtn: "ลบ", onlineBadge: "ออนไลน์", offlineBadge: "ออฟไลน์", unnamedSensor: "เซ็นเซอร์ไม่มีชื่อ", neverSeen: "ไม่เคย",
    userSuccess: "สร้างบัญชีสำเร็จแล้ว!", deviceSuccess: "ลงทะเบียนอุปกรณ์สำเร็จแล้ว!",
    confirmDeleteUser: "คุณแน่ใจหรือไม่ที่จะลบ บัญชีผู้ใช้นี้?", confirmDeleteDevice: "คุณแน่ใจหรือไม่ที่จะลบ อุปกรณ์นี้?",
    roleAdmin: "ผู้ดูแลระบบ", roleManager: "ผู้จัดการ", roleUser: "ผู้ใช้"
  },
  zh: {
    deleteBtn: "删除", onlineBadge: "在线", offlineBadge: "离线", unnamedSensor: "未命名传感器", neverSeen: "从未",
    userSuccess: "账户创建成功！", deviceSuccess: "设备注册成功！",
    confirmDeleteUser: "您确定要删除此用户账户吗？", confirmDeleteDevice: "您确定要删除此设备吗？",
    roleAdmin: "管理员", roleManager: "经理", roleUser: "用户"
  },
  vi: {
    deleteBtn: "Xóa", onlineBadge: "Trực tuyến", offlineBadge: "Ngoại tuyến", unnamedSensor: "Cảm biến chưa đặt tên", neverSeen: "Chưa bao giờ",
    userSuccess: "Tạo tài khoản thành công!", deviceSuccess: "Đăng ký thiết bị thành công!",
    confirmDeleteUser: "Bạn có chắc chắn muốn xóa tài khoản người dùng này không?", confirmDeleteDevice: "Bạn có chắc chắn muốn xóa thiết bị này không?",
    roleAdmin: "Quản trị viên", roleManager: "Quản lý", roleUser: "Người dùng"
  }
};

// 🌍 Centralized window.languages သို့မဟုတ် Local Backup ထံမှ စာသားရယူသော စနစ်
function getTranslation(key, lang) {
  const targetLang = lang.toLowerCase();
  
  // 1. script.js ၏ Centralized window.languages ထဲတွင် ရှာဖတ်ခြင်း
  if (window.languages && window.languages[targetLang] && window.languages[targetLang][key]) {
    return window.languages[targetLang][key];
  }
  if (window.languages && window.languages['en'] && window.languages['en'][key]) {
    return window.languages['en'][key];
  }
  
  // 2. Backup Dictionary ထံမှ ဖတ်ခြင်း
  const backupLang = internalSettingsDictionary[targetLang] || internalSettingsDictionary['en'];
  return backupLang[key] || internalSettingsDictionary['en'][key];
}

// 🔐 Static & Table Elements i18n Sync Engine (languageChanged Event ကြောင့် အလုပ်လုပ်သည်)
window.addEventListener('languageChanged', (e) => {
  const lang = e.detail.lang.toLowerCase(); 
  
  // index.html ရှိ [data-i18n] element များအားလုံးကို ဗဟိုစနစ်ဖြင့် ဘာသာပြန်ခြင်း
  if (window.languages && window.languages[lang]) {
    const dict = window.languages[lang];
    document.querySelectorAll('#settings-view [data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  }

  // Settings tables only need refreshing for authenticated users.
  if (localStorage.getItem('token') && window.settingsView && !window.settingsView.classList.contains('hidden')) {
    window.loadSettingsData();
  }
});
