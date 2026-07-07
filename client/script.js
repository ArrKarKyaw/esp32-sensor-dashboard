// 🚀 Auto-detect API Base URL (Localရော Vercelပါ အလိုအလျောက်သိစေရန်)
const API_URL = window.location.origin;

const socket = io(API_URL);

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
    appTitle: 'ဘယ်လ်လီဗေတာ အချက်အလက် ဒ႑ာရီ',
    loginTitle: 'အကောင့်ဝင်ပါ',
    loginInfo: 'သင့်အချက်အလက်များကို ထည့်ပါ',
    filterHeading: 'မှတ်တမ်း စစ်ထုတ်',
    applyButton: 'အသုံးပြုမည်',
    exportCsv: 'CSV ဒေါင်းလုဒ်',
    exportJson: 'JSON ဒေါင်းလုဒ်',
    chartHeading: 'စင်ဆာမှတ်တမ်း',
    settingsHeading: 'အက်ဒ်မင် ဆက်တင်',
    settingsInfo: 'အကောင့်များ ဖန်တီးပြီး အခန်းကဏ္ဍများကို စီမံပါ',
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
    loginError.classList.add('hidden');
    loginError.textContent = '';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save Token and Session info
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      // UI Changes on Success
      showDashboard();
    } catch (err) {
      console.error('Login Error:', err.message);
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    }
  });
}

function showDashboard() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!token) return;

  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  settingsView.classList.add('hidden');
  userActions.classList.remove('hidden');
  usernameLabel.textContent = `Hello, ${username}`;

  if (role === 'admin') {
    settingsButton.classList.remove('hidden');
  } else {
    settingsButton.classList.add('hidden');
  }
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

// Check if already logged in on page load
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
});