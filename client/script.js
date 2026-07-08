// 🚀 Auto-detect API Base URL
const API_URL = window.location.origin;

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const settingsView = document.getElementById('settings-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userActions = document.getElementById('user-actions');
const usernameLabel = document.getElementById('username-label');
const logoutButton = document.getElementById('logout-button');
const settingsButton = document.getElementById('settings-button');
const settingsBackButton = document.getElementById('settings-back-button');
let themeToggle = null;
let languageSelect = null;
let historyChart = null; // Chart.js Object ကို ထိန်းရန်

const translations = {
  en: {
    appTitle: 'Elevator Information Dashboard',
    loginTitle: 'Sign in',
    loginInfo: 'Enter your credentials to continue.',
    filterHeading: 'Filter history',
    applyButton: 'Apply',
    exportCsv: 'Download CSV',
    exportJson: 'Download JSON',
    chartHeading: 'Sensor history',
    settingsHeading: 'Admin Settings',
    settingsInfo: 'Create accounts and manage roles for admin, manager, and user access.',
    lightButton: 'Light',
    darkButton: 'Dark'
  },
  th: {
    appTitle: 'แดชบอร์ดข้อมูลลิฟต์',
    loginTitle: 'เข้าสู่ระบบ',
    loginInfo: 'กรุณากรอกข้อมูลประจำตัวของคุณ',
    filterHeading: 'กรองประวัติ',
    applyButton: 'ใช้งาน',
    exportCsv: 'ดาวน์โหลด CSV',
    exportJson: 'ดาวน์โหลด JSON',
    chartHeading: 'ประวัติข้อมูลเซ็นเซอร์',
    settingsHeading: 'การตั้งค่าสำหรับแอดมิน',
    settingsInfo: 'สร้างบัญชีและจัดการบทบาทของผู้ดูแลระบบ ผู้จัดการ และผู้ใช้',
    lightButton: 'สว่าง',
    darkButton: 'มืด'
  },
  my: {
    appTitle: 'ဓာတ်လှေကား အချက်အလက် Dashboard',
    loginTitle: 'အကောင့်ဝင်ပါ',
    loginInfo: 'သင့်အချက်အလက်များကို ထည့်ပါ',
    filterHeading: 'မှတ်တမ်း စစ်ထုတ်',
    applyButton: 'အသုံးပြုမည်',
    exportCsv: 'CSV ဒေါင်းလုဒ်',
    exportJson: 'JSON ဒေါင်းလုဒ်',
    chartHeading: 'ဆင်ဆာမှတ်တမ်း',
    settingsHeading: 'အက်ဒ်မင် ဆက်တင်',
    settingsInfo: 'အကောင့်များ ဖันတီးပြီး အခန်းကဏ္ဍများကို စီမံပါ',
    lightButton: 'အလင်း',
    darkButton: 'အမှောင်'
  },
  zh: {
    appTitle: '电梯信息仪表板',
    loginTitle: '登录',
    loginInfo: '请输入您的凭据以继续。',
    filterHeading: '筛选历史',
    applyButton: '应用',
    exportCsv: '下载 CSV',
    exportJson: '下载 JSON',
    chartHeading: '传感器历史',
    settingsHeading: '管理员设置',
    settingsInfo: '创建帐户并管理管理员、经理和用户角色。',
    lightButton: '明亮',
    darkButton: '黑暗'
  },
  vi: {
    appTitle: 'Bảng điều khiển thang máy',
    loginTitle: 'Đăng nhập',
    loginInfo: 'Nhập thông tin đăng nhập của bạn để tiếp tục.',
    filterHeading: 'Lọc lịch sử',
    applyButton: 'Áp dụng',
    exportCsv: 'Tải CSV',
    exportJson: 'Tải JSON',
    chartHeading: 'Lịch sử cảm biến',
    settingsHeading: 'Cài đặt quản trị viên',
    settingsInfo: 'Tạo tài khoản và quản lý vai trò quản trị viên, quản lý và người dùng.',
    lightButton: 'Sáng',
    darkButton: 'Tối'
  }
};

// Handle Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (loginError) {
      loginError.classList.add('hidden');
      loginError.textContent = '';
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        let errorMsg = 'Login failed';
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch(e) {
          errorMsg = `Server Error (${response.status}).`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      showDashboard();
    } catch (err) {
      console.error('Login Error:', err.message);
      if (loginError) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
      }
    }
  });
}

function showDashboard() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!token) return;

  if (loginView) loginView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
  if (settingsView) settingsView.classList.add('hidden');
  if (userActions) userActions.classList.remove('hidden');
  if (usernameLabel) usernameLabel.textContent = `Hello, ${username}`;

  if (settingsButton) {
    if (role === 'admin') {
      settingsButton.classList.remove('hidden');
    } else {
      settingsButton.classList.add('hidden');
    }
  }

  // Dashboard ပွင့်လာလျှင် ဆင်ဆာဒေတာများကို ချက်ချင်းဆွဲထုတ်မည်
  updateDashboardData();
}

// Log out Action
if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.location.reload();
  });
}

// Theme toggle
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    if (themeToggle) {
      const currentLang = languageSelect?.value || 'en';
      themeToggle.textContent = translations[currentLang]?.darkButton || 'Dark';
    }
  } else {
    document.body.classList.remove('light-mode');
    if (themeToggle) {
      const currentLang = languageSelect?.value || 'en';
      themeToggle.textContent = translations[currentLang]?.lightButton || 'Light';
    }
  }
  localStorage.setItem('theme', theme);
}

// Language selector
function applyLanguage(lang) {
  const locale = translations[lang] ? lang : 'en';
  const strings = translations[locale];

  document.documentElement.lang = locale;
  if (document.getElementById('app-title')) document.getElementById('app-title').textContent = strings.appTitle;
  if (document.getElementById('login-title')) document.getElementById('login-title').textContent = strings.loginTitle;
  if (document.getElementById('login-info')) document.getElementById('login-info').textContent = strings.loginInfo;
  if (document.getElementById('filter-heading')) document.getElementById('filter-heading').textContent = strings.filterHeading;
  if (document.getElementById('chart-heading')) document.getElementById('chart-heading').textContent = strings.chartHeading;
  if (document.getElementById('settings-heading')) document.getElementById('settings-heading').textContent = strings.settingsHeading;
  if (document.getElementById('settings-info')) document.getElementById('settings-info').textContent = strings.settingsInfo;
  if (document.getElementById('filter-button')) document.getElementById('filter-button').textContent = strings.applyButton;
  if (document.getElementById('export-csv')) document.getElementById('export-csv').textContent = strings.exportCsv;
  if (document.getElementById('export-json')) document.getElementById('export-json').textContent = strings.exportJson;

  if (themeToggle) {
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    themeToggle.textContent = currentTheme === 'light' ? strings.darkButton : strings.lightButton;
  }

  if (languageSelect) {
    languageSelect.value = locale;
  }

  localStorage.setItem('language', locale);
}

// Navigation Controls
if (settingsButton) {
  settingsButton.addEventListener('click', () => {
    dashboardView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  });
}

if (settingsBackButton) {
  settingsBackButton.addEventListener('click', () => {
    settingsView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  });
}

// Create User form handling (Admin settings)
const createUserForm = document.getElementById('create-user-form');
const settingsError = document.getElementById('settings-error');
if (createUserForm) {
  createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (settingsError) {
      settingsError.classList.add('hidden');
      settingsError.textContent = '';
    }

    const username = document.getElementById('new-username').value.trim();
    const email = document.getElementById('new-email')?.value.trim();
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;

    if (!username || !password) {
      if (settingsError) {
        settingsError.textContent = 'Username and password are required.';
        settingsError.classList.remove('hidden');
      }
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ username, email, password, role })
      });

      if (!res.ok) {
        let errorMsg = 'Failed to create user';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();

      createUserForm.reset();
      if (settingsError) {
        settingsError.textContent = `Created user ${data.username} (id ${data.id})`;
        settingsError.classList.remove('hidden');
        setTimeout(() => settingsError.classList.add('hidden'), 3000);
      }
    } catch (err) {
      console.error('Create user error:', err.message);
      if (settingsError) {
        settingsError.textContent = err.message;
        settingsError.classList.remove('hidden');
      }
    }
  });
}

// ==========================================
// 🚀 REAL-TIME SENSOR DATA FETCH & CHART (UPDATED)
// ==========================================
async function updateDashboardData() {
  if (dashboardView && dashboardView.classList.contains('hidden')) return;

  try {
    const response = await fetch('/api/get-sensor');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();

    if (data && data.length > 0) {
      // ၁။ HTML Cards များကို သင့် index.html ID အတိုင်း ကွက်တိတန်ဖိုးသွင်းခြင်း
      const latestData = data[0]; 
      
      const tempEl = document.getElementById('temperature-value');
      const humidEl = document.getElementById('humidity-value');
      const pressEl = document.getElementById('pressure-value');
      const otherEl = document.getElementById('other-value');

      if (tempEl) tempEl.innerText = latestData.temperature ? latestData.temperature.toFixed(1) + " °C" : "-- °C";
      if (humidEl) humidEl.innerText = latestData.humidity ? latestData.humidity.toFixed(1) + " %" : "-- %";
      if (pressEl) pressEl.innerText = latestData.pressure ? latestData.pressure.toFixed(1) + " hPa" : "-- hPa";
      if (otherEl) otherEl.innerText = latestData.other || "No note data";

      // ၂။ Chart.js ကို ဒေတာမှတ်တမ်းအဟောင်း ၂၀ ဖြင့် Real-time ဆွဲပေးခြင်း
      updateHistoryChart(data);

      console.log("Real-time Dashboard Updated:", latestData);
    }
  } catch (error) {
    console.error("Error fetching sensor data:", error);
  }
}

// Chart update လုပ်ရန် Function
function updateHistoryChart(sensorLogs) {
  const ctx = document.getElementById('history-chart');
  if (!ctx) return;

  // Chart ဆွဲရန်အတွက် ခေါ်ယူထားသော data (၂၀ ခု) ကို အချိန်စဉ်အတိုင်း ရှေ့နောက်ပြန်စီပေးရပါမည်
  const reversedLogs = [...sensorLogs].reverse();
  
  const labels = reversedLogs.map(log => new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const tempDataset = reversedLogs.map(log => log.temperature);
  const humidDataset = reversedLogs.map(log => log.humidity);

  if (historyChart) {
    // Chart ရှိပြီးသားဆိုလျှင် ဒေတာအသစ်လဲပြီး Update လုပ်ရုံပါပဲ
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = tempDataset;
    historyChart.data.datasets[1].data = humidDataset;
    historyChart.update('none'); // animation ခဏပိတ်ပြီး သွက်သွက်မြန်မြန် update လုပ်ရန်
  } else {
    // Chart လုံးဝမရှိသေးလျှင် အသစ်တစ်ခု စဆောက်ပါမည်
    historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: tempDataset,
            borderColor: '#ff6384',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y'
          },
          {
            label: 'Humidity (%)',
            data: humidDataset,
            borderColor: '#36a2eb',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Temp (°C)' } },
          y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Humid (%)' } }
        }
      }
    });
  }
}

// DOMContentLoaded Event Handling
window.addEventListener('DOMContentLoaded', () => {
  themeToggle = document.getElementById('theme-toggle');
  languageSelect = document.getElementById('language-select');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
      applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
  }

  if (languageSelect) {
    languageSelect.addEventListener('change', (event) => {
      applyLanguage(event.target.value);
    });
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  const savedLanguage = localStorage.getItem('language') || 'en';

  applyTheme(savedTheme);
  applyLanguage(savedLanguage);

  if (localStorage.getItem('token')) {
    showDashboard();
  }

  // ၅ စက္ကန့်တစ်ခါ Backend မှ ဒေတာအသစ်ကို ပုံမှန် လှမ်းဆွဲပေးမည့် Timer
  setInterval(updateDashboardData, 5000);
});