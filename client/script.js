// 🎯 Global Variables 
window.allSensorData = []; 
window.historyChart = null;

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

const createUserForm = document.getElementById('create-user-form');
const createDeviceForm = document.getElementById('create-device-form');
const settingsError = document.getElementById('settings-error');
const deviceError = document.getElementById('device-error');
const usersTableBody = document.getElementById('users-table-body');
const devicesTableBody = document.getElementById('devices-table-body');

// 🛠️ Helper to Safely get Device ID
function getDevId(item) {
  if (!item) return '';
  return item.device_id || item.ce_id || '';
}

// ⚙️ Navigation
if (settingsButton) {
  settingsButton.addEventListener('click', () => {
    if (dashboardView) dashboardView.classList.add('hidden');
    if (settingsView) settingsView.classList.remove('hidden');
    loadSettingsData(); 
  });
}

if (settingsBackButton) {
  settingsBackButton.addEventListener('click', () => {
    showDashboard();
  });
}

// ========================================================
// 🚀 REAL-TIME MULTI-ESP LIFT LIST & REFRESH LOGIC
// ========================================================
async function updateDashboardData() {
  if (dashboardView && dashboardView.classList.contains('hidden')) return;
  try {
    const response = await fetch('/api/get-sensor');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawData = await response.json();

    if (rawData && rawData.length > 0) {
      window.allSensorData = rawData
        .filter(item => getDevId(item) !== '')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (window.allSensorData.length > 0) {
        renderElevatorList(window.allSensorData);
        updateDeviceSelectOptions(window.allSensorData);
        applyFiltersAndRender();
      }
    }
  } catch (error) {
    console.error("Error fetching sensor data:", error);
  }
}

function renderElevatorList(data) {
  const listContainer = document.getElementById('lift-status-list');
  if (!listContainer) return;

  const deviceKeys = [...new Set(data.map(item => getDevId(item)).filter(Boolean))];
  listContainer.innerHTML = ""; 

  deviceKeys.forEach(devId => {
    const devData = data.find(item => getDevId(item) === devId);
    if (!devData) return;
    
    const isOpen = devData.door_status === "Open";
    const statusColor = isOpen ? "#ff6384" : "#4bc0c0";

    const liftCard = document.createElement('div');
    liftCard.style = `
      border-left: 5px solid ${statusColor}; 
      padding: 12px; 
      min-width: 160px; 
      cursor: pointer; 
      background: rgba(255, 255, 255, 0.05); 
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;
    
    const tempVal = (devData.temperature && devData.temperature > 0) ? devData.temperature.toFixed(1) + "°C" : "--°C";
    
    liftCard.innerHTML = `
      <h4 style="margin:0 0 5px 0; color:#01919d; font-size:1.1rem;">${devId.toUpperCase()}</h4>
      <p style="margin:3px 0; font-size:0.9rem;">Temp: <b>${tempVal}</b></p>
      <p style="margin:3px 0; font-size:0.9rem;">Door: <span style="color:${statusColor}; font-weight:bold;">${devData.door_status || 'Unknown'}</span></p>
    `;
    
    liftCard.onclick = () => {
      const deviceSelect = document.getElementById('device-select');
      if (deviceSelect) {
        deviceSelect.value = devId;
        applyFiltersAndRender();
      }
    };

    listContainer.appendChild(liftCard);
  });
}

function updateDeviceSelectOptions(data) {
  const deviceSelect = document.getElementById('device-select');
  if (!deviceSelect) return;
  const currentSelected = deviceSelect.value;
  deviceSelect.innerHTML = '<option value="" style="color: #222222; background-color: #ffffff;">-- Select Device --</option>';
  const uniqueDevices = [...new Set(data.map(item => getDevId(item)).filter(Boolean))];
  uniqueDevices.forEach(devKey => {
    let opt = document.createElement('option');
    opt.value = devKey;
    opt.innerHTML = devKey.toUpperCase();
    opt.style.color = "#222222";          
    opt.style.backgroundColor = "#ffffff"; 
    deviceSelect.appendChild(opt);
  });
  if (currentSelected) {
    deviceSelect.value = currentSelected;
  }
}

function updateHistoryChart(deviceId, sensorLogs) {
  const ctx = document.getElementById('history-chart');
  if (!ctx) return;

  const reversedLogs = [...sensorLogs].slice(0, 20).reverse();
  const labels = reversedLogs.map(log => new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  if (window.historyChart) {
    window.historyChart.destroy();
    window.historyChart = null;
  }

  let datasets = [];
  if (deviceId === 'lift-01' || deviceId === 'lift-03') {
    datasets = [
      { label: 'Temperature (°C)', data: reversedLogs.map(log => log.temperature || null), borderColor: '#ff6384', borderWidth: 2, tension: 0.2 },
      { label: 'Humidity (%)', data: reversedLogs.map(log => log.humidity || null), borderColor: '#36a2eb', borderWidth: 2, tension: 0.2 }
    ];
  } else if (deviceId === 'lift-02') {
    datasets = [
      { label: 'Accel X', data: reversedLogs.map(log => log.accel_x || 0), borderColor: '#ff6384', borderWidth: 2, tension: 0.2 },
      { label: 'Accel Y', data: reversedLogs.map(log => log.accel_y || 0), borderColor: '#36a2eb', borderWidth: 2, tension: 0.2 },
      { label: 'Accel Z', data: reversedLogs.map(log => log.accel_z || 0), borderColor: '#4bc0c0', borderWidth: 2, tension: 0.2 }
    ];
  }

  window.historyChart = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: { responsive: true }
  });
}

// ========================================================
// 🧼 FILTER AND UI RENDER LOGIC (LOCAL DATE COMPONENT)
// ========================================================
function applyFiltersAndRender() {
  let filteredData = [...window.allSensorData];
  const selectedDevice = document.getElementById('device-select')?.value;

  renderElevatorList(window.allSensorData);

  if (!selectedDevice) {
    resetUIElements();
    return;
  }
  
  filteredData = filteredData.filter(item => getDevId(item) === selectedDevice);

  const startDateStr = document.getElementById('start-date')?.value; 
  const endDateStr = document.getElementById('end-date')?.value;

  if (startDateStr) {
    filteredData = filteredData.filter(item => {
      const itemDateStr = new Date(item.created_at).toISOString().split('T')[0];
      return itemDateStr >= startDateStr;
    });
  }

  if (endDateStr) {
    filteredData = filteredData.filter(item => {
      const itemDateStr = new Date(item.created_at).toISOString().split('T')[0];
      return itemDateStr <= endDateStr;
    });
  }

  if (filteredData.length > 0) {
    const latest = filteredData[0];

    if (document.getElementById('temperature-value')) {
      document.getElementById('temperature-value').innerText = (latest.temperature && latest.temperature > 0) ? latest.temperature.toFixed(1) + " °C" : "-- °C";
    }
    if (document.getElementById('humidity-value')) {
      document.getElementById('humidity-value').innerText = (latest.humidity && latest.humidity > 0) ? latest.humidity.toFixed(1) + " %" : "-- %";
    }
    if (document.getElementById('pressure-value')) {
      document.getElementById('pressure-value').innerText = (latest.pressure && latest.pressure > 0) ? latest.pressure.toFixed(1) + " hPa" : "-- hPa";
    }
    if (document.getElementById('other-value')) {
      document.getElementById('other-value').innerText = getDevId(latest) ? `Active: ${getDevId(latest).toUpperCase()}` : "--";
    }
    if (document.getElementById('door-status-value')) {
      document.getElementById('door-status-value').innerText = latest.door_status || "--";
      document.getElementById('door-status-value').style.color = latest.door_status === "Open" ? "#ff6384" : "#4bc0c0";
    }
    if (document.getElementById('vibration-value')) {
      document.getElementById('vibration-value').innerHTML = `
        X: <b>${latest.accel_x?.toFixed(2) || '0.00'}</b> | 
        Y: <b>${latest.accel_y?.toFixed(2) || '0.00'}</b> | 
        Z: <b>${latest.accel_z?.toFixed(2) || '0.00'}</b> m/s²
      `;
    }

    updateHistoryChart(selectedDevice, filteredData);
  } else {
    resetUIElements();
    if (document.getElementById('other-value')) {
      document.getElementById('other-value').innerText = "No data found for the selected date range.";
    }
  }
}

function resetUIElements() {
  if (document.getElementById('temperature-value')) document.getElementById('temperature-value').innerText = "-- °C";
  if (document.getElementById('humidity-value')) document.getElementById('humidity-value').innerText = "-- %";
  if (document.getElementById('pressure-value')) document.getElementById('pressure-value').innerText = "-- hPa";
  if (document.getElementById('other-value')) document.getElementById('other-value').innerText = "Please select a device";
  if (document.getElementById('door-status-value')) {
    document.getElementById('door-status-value').innerText = "--";
    document.getElementById('door-status-value').style.color = "#ffffff";
  }
  if (document.getElementById('vibration-value')) {
    document.getElementById('vibration-value').innerHTML = "X: -- | Y: -- | Z: --";
  }
}

// 🎯 Event Bindings & Initialization
window.addEventListener('DOMContentLoaded', () => {
  const deviceSelectEl = document.getElementById('device-select');
  if (deviceSelectEl) {
    deviceSelectEl.style.color = "#222222";
    deviceSelectEl.style.backgroundColor = "#ffffff";
  }

  document.getElementById('filter-button')?.addEventListener('click', (e) => {
    e.preventDefault(); 
    applyFiltersAndRender();
  });
  
  document.getElementById('device-select')?.addEventListener('change', applyFiltersAndRender);
  document.getElementById('export-csv')?.addEventListener('click', exportToCSV);
  document.getElementById('export-json')?.addEventListener('click', exportToJSON);

  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = 'Dark';
      } else {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = 'Light';
      }
    });
  }

  if (localStorage.getItem('token')) { 
    showDashboard();
  } else {
    if (loginView) loginView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (userActions) userActions.classList.add('hidden');
  }

  setInterval(updateDashboardData, 5000); 
});