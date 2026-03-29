if (window.location.protocol === 'file:') {
  window.location.replace(`http://localhost:3000${window.location.search}`);
}
const apiRoot = window.location.origin;
let socket;
let chart;
let currentReadings = [];

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const userActions = document.getElementById('user-actions');
const usernameLabel = document.getElementById('username-label');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const temperatureValue = document.getElementById('temperature-value');
const humidityValue = document.getElementById('humidity-value');
const pressureValue = document.getElementById('pressure-value');
const otherValue = document.getElementById('other-value');
const filterButton = document.getElementById('filter-button');
const exportCsvButton = document.getElementById('export-csv');
const exportJsonButton = document.getElementById('export-json');
const logoutButton = document.getElementById('logout-button');
const deviceSelect = document.getElementById('device-select');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const chartCanvas = document.getElementById('history-chart').getContext('2d');
const settingsButton = document.getElementById('settings-button');
const settingsView = document.getElementById('settings-view');
const settingsBackButton = document.getElementById('settings-back-button');
const usersTableBody = document.getElementById('users-table-body');
const createUserForm = document.getElementById('create-user-form');
const settingsError = document.getElementById('settings-error');
const createDeviceForm = document.getElementById('create-device-form');
const deviceError = document.getElementById('device-error');
const devicesTableBody = document.getElementById('devices-table-body');
const themeButton = document.getElementById('theme-toggle');
const languageSelect = document.getElementById('language-select');

let currentUserRole = null;
let currentLanguage = localStorage.getItem('uiLanguage') || 'en';
let currentUserId = null;

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

const translations = {
  en: {
    pageTitle: 'Elevator Information Dashboard',
    signInHeading: 'Sign in',
    loginInfo: 'Use the Account To Login.',
    loginButton: 'Login',
    defaultLogin: 'Default login: <strong>admin</strong> / <strong>admin123</strong>',
    filterHeading: 'Filter history',
    applyButton: 'Apply',
    exportCsv: 'Download CSV',
    exportJson: 'Download JSON',
    sensorHistory: 'Sensor history',
    adminSettings: 'Admin Settings',
    adminInfo: 'Create accounts and manage roles for admin, manager, and user access.',
    createAccount: 'Create Account'
  },
  th: {
    pageTitle: 'แดชบอร์ดข้อมูลลิฟต์',
    signInHeading: 'เข้าสู่ระบบ',
    loginInfo: 'ใช้บัญชีเริ่มต้นด้านล่างหรือข้อมูลประจำตัวของคุณเอง',
    loginButton: 'เข้าสู่ระบบ',
    defaultLogin: 'เข้าสู่ระบบเริ่มต้น: <strong>admin</strong> / <strong>admin123</strong>',
    filterHeading: 'กรองประวัติ',
    applyButton: 'ใช้',
    exportCsv: 'ดาวน์โหลด CSV',
    exportJson: 'ดาวน์โหลด JSON',
    sensorHistory: 'ประวัติเซ็นเซอร์',
    adminSettings: 'การตั้งค่าแอดมิน',
    adminInfo: 'สร้างบัญชีและจัดการบทบาท admin, manager, user',
    createAccount: 'สร้างบัญชี'
  },
  my: {
    pageTitle: 'လှေကား အချက်အလက် ဒိုင်ယာဘုတ်',
    signInHeading: 'အကောင့်ဝင်မည်',
    loginInfo: 'အောက်ပါသတ်မှတ်အကောင့် သို့မဟုတ် ကိုယ့်အချက်အလက်ဖြင့် အသုံးပြုပါ',
    loginButton: 'ဝင်မည်',
    defaultLogin: 'ပုံမှန်အကောင့်: <strong>admin</strong> / <strong>admin123</strong>',
    filterHeading: 'သမိုင်းစဉ် ချရေး',
    applyButton: 'လျှောက်ထား',
    exportCsv: 'CSV ဒေါင်းလုဒ်',
    exportJson: 'JSON ဒေါင်းလုဒ်',
    sensorHistory: 'ဆင်ဆာ မှတ်တမ်း',
    adminSettings: 'အက်ဒ်မင် ဆက်တင်',
    adminInfo: 'အကောင့်များ ဖန်တီး၍ admin, manager, user အခန်းကဏ္ဍ စီမံပါ',
    createAccount: 'အကောင့် ဖန်တီး'
  },
  zh: {
    pageTitle: '电梯信息仪表板',
    signInHeading: '登录',
    loginInfo: '使用下面的默认帐户或您自己的凭据。',
    loginButton: '登录',
    defaultLogin: '默认登录：<strong>admin</strong> / <strong>admin123</strong>',
    filterHeading: '筛选历史',
    applyButton: '应用',
    exportCsv: '下载 CSV',
    exportJson: '下载 JSON',
    sensorHistory: '传感器历史',
    adminSettings: '管理员设置',
    adminInfo: '创建账户并管理 admin、manager、user 角色',
    createAccount: '创建账户'
  },
  vi: {
    pageTitle: 'Bảng thông tin thang máy',
    signInHeading: 'Đăng nhập',
    loginInfo: 'Sử dụng tài khoản mặc định bên dưới hoặc thông tin của bạn.',
    loginButton: 'Đăng nhập',
    defaultLogin: 'Đăng nhập mặc định: <strong>admin</strong> / <strong>admin123</strong>',
    filterHeading: 'Lọc lịch sử',
    applyButton: 'Áp dụng',
    exportCsv: 'Tải CSV',
    exportJson: 'Tải JSON',
    sensorHistory: 'Lịch sử cảm biến',
    adminSettings: 'Cài đặt quản trị',
    adminInfo: 'Tạo tài khoản và quản lý vai trò admin, manager, user',
    createAccount: 'Tạo tài khoản'
  }
};

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('uiLanguage', lang);
  if (languageSelect) {
    languageSelect.value = lang;
  }
  translatePage();
}

function translatePage() {
  const t = translations[currentLanguage] || translations.en;
  document.title = t.pageTitle;
  const appTitle = document.getElementById('app-title');
  const loginTitle = document.getElementById('login-title');
  const loginInfo = document.getElementById('login-info');
  const loginButton = document.getElementById('login-button');
  const hintBox = document.getElementById('hint-box');
  const filterHeading = document.getElementById('filter-heading');
  const exportCsv = document.getElementById('export-csv');
  const exportJson = document.getElementById('export-json');
  const chartHeading = document.getElementById('chart-heading');
  const settingsHeading = document.getElementById('settings-heading');
  const settingsInfo = document.getElementById('settings-info');
  const createAccount = document.getElementById('create-account-button');

  if (appTitle) appTitle.textContent = t.pageTitle;
  if (loginTitle) loginTitle.textContent = t.signInHeading;
  if (loginInfo) loginInfo.textContent = t.loginInfo;
  if (loginButton) loginButton.textContent = t.loginButton;
  if (hintBox) hintBox.innerHTML = t.defaultLogin;
  if (filterHeading) filterHeading.textContent = t.filterHeading;
  if (exportCsv) exportCsv.textContent = t.exportCsv;
  if (exportJson) exportJson.textContent = t.exportJson;
  if (chartHeading) chartHeading.textContent = t.sensorHistory;
  if (settingsHeading) settingsHeading.textContent = t.adminSettings;
  if (settingsInfo) settingsInfo.textContent = t.adminInfo;
  if (createAccount) createAccount.textContent = t.createAccount;
}

function applyTheme(theme) {
  const body = document.body;
  if (theme === 'light') {
    body.classList.add('light-mode');
    themeButton.textContent = 'Dark';
  } else {
    body.classList.remove('light-mode');
    themeButton.textContent = 'Light';
  }
  localStorage.setItem('dashboardTheme', theme);
}

function toggleTheme() {
  const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

function loadTheme() {
  const saved = localStorage.getItem('dashboardTheme') || 'dark';
  applyTheme(saved);
}

async function tryLoginFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');
  const password = params.get('password');

  if (!username || !password) {
    return null;
  }

  try {
    const result = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(result.token);
    history.replaceState(null, '', window.location.pathname);
    return result;
  } catch (error) {
    loginError.textContent = 'Invalid credentials in URL. Use admin/admin123.';
    loginError.classList.remove('hidden');
    return null;
  }
}

function showSection(isAuthenticated) {
  if (isAuthenticated) {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    userActions.classList.remove('hidden');
  } else {
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    settingsView.classList.add('hidden');
    userActions.classList.add('hidden');
  }
}

function showDashboard() {
  dashboardView.classList.remove('hidden');
  settingsView.classList.add('hidden');
}

function showSettings() {
  dashboardView.classList.add('hidden');
  settingsView.classList.remove('hidden');
  settingsError.classList.add('hidden');
  Promise.all([loadUsers(), loadDevices()]).catch((error) => {
    settingsError.textContent = error.message;
    settingsError.classList.remove('hidden');
  });
}

function toggleSettingsAccess() {
  if (currentUserRole === 'admin') {
    settingsButton.classList.remove('hidden');
  } else {
    settingsButton.classList.add('hidden');
    settingsView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  }
}

async function loadUsers() {
  const users = await apiRequest('/users');
  usersTableBody.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.role}</td>
          <td>
            ${user.id === currentUserId ? '<em>Current</em>' : `<button data-user-id="${user.id}" class="button button-secondary">Delete</button>`}
          </td>
        </tr>`
    )
    .join('');
}

async function loadDevices() {
  const devices = await apiRequest('/devices');
  if (deviceSelect) {
    deviceSelect.innerHTML = '<option value="">All devices</option>' +
      devices
        .map((device) => `<option value="${device.id}">${device.name || device.deviceKey}</option>`)
        .join('');
  }
  if (devicesTableBody) {
    devicesTableBody.innerHTML = devices
      .map((device) => `
        <tr>
          <td>${device.id}</td>
          <td>${device.deviceKey}</td>
          <td>${device.name || ''}</td>
          <td>${device.lastSeen || 'N/A'}</td>
          <td>${device.temperature ?? '--'}</td>
          <td>${device.humidity ?? '--'}</td>
          <td>${device.pressure ?? '--'}</td>
          <td>
            ${currentUserRole === 'admin' ? `<button data-device-id="${device.id}" data-action="rename" class="button button-secondary">Rename</button>` : ''}
          </td>
        </tr>`
      )
      .join('');
  }
}

async function handleCreateUser(event) {
  event.preventDefault();
  settingsError.classList.add('hidden');
  const formData = new FormData(createUserForm);
  const username = formData.get('username').trim();
  const password = formData.get('password').trim();
  const role = formData.get('role');

  if (!username || !password || !role) {
    settingsError.textContent = 'All fields are required.';
    settingsError.classList.remove('hidden');
    return;
  }

  try {
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    });
    createUserForm.reset();
    await loadUsers();
  } catch (error) {
    settingsError.textContent = error.message;
    settingsError.classList.remove('hidden');
  }
}

async function handleCreateDevice(event) {
  event.preventDefault();
  deviceError.classList.add('hidden');
  const formData = new FormData(createDeviceForm);
  const deviceKey = formData.get('deviceKey').trim();
  const name = formData.get('name').trim();

  if (!deviceKey || !name) {
    deviceError.textContent = 'Device key and name are required.';
    deviceError.classList.remove('hidden');
    return;
  }

  try {
    await apiRequest('/devices', {
      method: 'POST',
      body: JSON.stringify({ deviceKey, name })
    });
    createDeviceForm.reset();
    await loadDevices();
  } catch (error) {
    deviceError.textContent = error.message;
    deviceError.classList.remove('hidden');
  }
}

async function handleDeviceTableClick(event) {
  const button = event.target.closest('button[data-device-id]');
  if (!button) {
    return;
  }
  const deviceId = Number(button.dataset.deviceId);
  const action = button.dataset.action;
  if (action === 'rename') {
    const newName = prompt('Enter a new device name:');
    if (!newName) {
      return;
    }
    try {
      await apiRequest(`/devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName })
      });
      await loadDevices();
    } catch (error) {
      deviceError.textContent = error.message;
      deviceError.classList.remove('hidden');
    }
  }
}

async function handleUserTableClick(event) {
  const button = event.target.closest('button[data-user-id]');
  if (!button) {
    return;
  }
  const userId = Number(button.dataset.userId);
  if (!userId) {
    return;
  }
  if (!confirm('Delete this account?')) {
    return;
  }

  try {
    await apiRequest(`/users/${userId}`, { method: 'DELETE' });
    await loadUsers();
  } catch (error) {
    settingsError.textContent = error.message;
    settingsError.classList.remove('hidden');
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON response for', path, 'response:', text);
      throw new Error('Server returned invalid JSON. Please check the backend.');
    }
  }

  if (!response.ok) {
    const errorMessage = (data && data.error) ? data.error : text || response.statusText;
    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error(`Expected JSON response from ${path}, got: ${text.slice(0, 200)}`);
  }

  return data;
}

function createChart() {
  chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperature (°C)',
          data: [],
          borderColor: 'rgba(56, 189, 248, 1)',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          tension: 0.3,
          yAxisID: 'y1'
        },
        {
          label: 'Humidity (%)',
          data: [],
          borderColor: 'rgba(52, 211, 153, 1)',
          backgroundColor: 'rgba(52, 211, 153, 0.2)',
          tension: 0.3,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          type: 'category',
          title: {
            display: true,
            text: 'Timestamp'
          }
        },
        y1: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: '°C' }
        },
        y2: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '%' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function updateChart() {
  const labels = currentReadings.map((item) => item.timestamp);
  const temperatureData = currentReadings.map((item) => item.temperature);
  const humidityData = currentReadings.map((item) => item.humidity);

  chart.data.labels = labels;
  chart.data.datasets[0].data = temperatureData;
  chart.data.datasets[1].data = humidityData;
  chart.update();
}

function updateCards(reading) {
  if (!reading) {
    temperatureValue.textContent = '-- °C';
    humidityValue.textContent = '-- %';
    pressureValue.textContent = '-- hPa';
    otherValue.textContent = 'No data yet';
    return;
  }

  temperatureValue.textContent = `${reading.temperature.toFixed(1)} °C`;
  humidityValue.textContent = `${reading.humidity.toFixed(1)} %`;
  pressureValue.textContent = reading.pressure ? `${reading.pressure.toFixed(1)} hPa` : '-- hPa';
  otherValue.textContent = reading.other || 'No extra reading';
}

function appendReading(reading) {
  currentReadings.push(reading);
  currentReadings = currentReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  updateCards(currentReadings[currentReadings.length - 1]);
  updateChart();
}

async function loadSensorData() {
  const params = new URLSearchParams();
  if (startDateInput.value) params.set('start', new Date(startDateInput.value).toISOString());
  if (endDateInput.value) params.set('end', new Date(endDateInput.value).toISOString());
  if (deviceSelect && deviceSelect.value) params.set('deviceId', deviceSelect.value);

  const path = `/sensor-data?${params.toString()}`;
  const data = await apiRequest(path);
  currentReadings = data;
  if (currentReadings.length > 0) {
    updateCards(currentReadings[currentReadings.length - 1]);
  }
  updateChart();
}

function connectSocket() {
  socket = io(apiRoot);
  socket.on('connect', () => {
    console.log('Connected to server by WebSocket');
  });
  socket.on('sensor-update', (reading) => {
    appendReading(reading);
  });
}

function downloadFile(contents, filename, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  if (currentReadings.length === 0) {
    alert('No sensor data to export.');
    return;
  }
  const rows = [
    ['id', 'temperature', 'humidity', 'pressure', 'other', 'timestamp'],
    ...currentReadings.map((item) => [
      item.id,
      item.temperature,
      item.humidity,
      item.pressure ?? '',
      `"${String(item.other || '').replace(/"/g, '""')}"`,
      item.timestamp
    ])
  ];
  const csvText = rows.map((row) => row.join(',')).join('\n');
  downloadFile(csvText, 'sensor-data.csv', 'text/csv');
}

function exportJson() {
  if (currentReadings.length === 0) {
    alert('No sensor data to export.');
    return;
  }
  const jsonText = JSON.stringify(currentReadings, null, 2);
  downloadFile(jsonText, 'sensor-data.json', 'application/json');
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.classList.add('hidden');
  const formData = new FormData(loginForm);
  const username = formData.get('username').trim();
  const password = formData.get('password').trim();

  try {
    const result = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(result.token);
    currentUserRole = result.role;
    currentUserId = result.id;
    usernameLabel.textContent = `Signed in as ${result.username} (${result.role})`;
    toggleSettingsAccess();
    showDashboard();
    showSection(true);
    await loadDevices();
    await loadSensorData();
    connectSocket();
    return;
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  }
}

function handleLogout() {
  setAuthToken(null);
  currentUserRole = null;
  currentUserId = null;
  settingsButton.classList.add('hidden');
  showSection(false);
  currentReadings = [];
  updateCards(null);
  if (socket) {
    socket.disconnect();
  }
}

async function initDashboard() {
  createChart();
  loginForm.addEventListener('submit', handleLogin);
  filterButton.addEventListener('click', loadSensorData);
  exportCsvButton.addEventListener('click', exportCsv);
  exportJsonButton.addEventListener('click', exportJson);
  logoutButton.addEventListener('click', handleLogout);
  settingsButton.addEventListener('click', showSettings);
  settingsBackButton.addEventListener('click', showDashboard);
  createUserForm.addEventListener('submit', handleCreateUser);
  createDeviceForm.addEventListener('submit', handleCreateDevice);
  usersTableBody.addEventListener('click', handleUserTableClick);
  devicesTableBody.addEventListener('click', handleDeviceTableClick);
  if (deviceSelect) {
    deviceSelect.addEventListener('change', loadSensorData);
  }
  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme);
  }
  if (languageSelect) {
    languageSelect.addEventListener('change', (event) => setLanguage(event.target.value));
  }
  loadTheme();
  setLanguage(currentLanguage);

  const queryLogin = await tryLoginFromQuery();
  if (queryLogin) {
    currentUserRole = queryLogin.role;
    currentUserId = queryLogin.id;
    usernameLabel.textContent = `Signed in as ${queryLogin.username} (${queryLogin.role})`;
    toggleSettingsAccess();
    await loadDevices();
    showDashboard();
    showSection(true);
    await loadSensorData();
    connectSocket();
    return;
  }

  const token = getAuthToken();
  if (token) {
    try {
      const me = await apiRequest('/me');
      currentUserRole = me.role;
      currentUserId = me.id;
      usernameLabel.textContent = `Signed in as ${me.username} (${me.role})`;
      toggleSettingsAccess();
      await loadDevices();
      showDashboard();
      showSection(true);
      await loadSensorData();
      connectSocket();
      return;
    } catch (_) {
      handleLogout();
    }
  }
  showSection(false);
}

window.addEventListener('DOMContentLoaded', initDashboard);
