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

// Settings Navigation Buttons
const settingsButton = document.getElementById('settings-button');
const settingsBackButton = document.getElementById('settings-back-button');

// Forms & Tables Elements
const createUserForm = document.getElementById('create-user-form');
const createDeviceForm = document.getElementById('create-device-form');
const settingsError = document.getElementById('settings-error');
const deviceError = document.getElementById('device-error');
const usersTableBody = document.getElementById('users-table-body');
const devicesTableBody = document.getElementById('devices-table-body');

// 🔐 ၁။ Handle Login System
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error('Login failed');
   
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role || 'user'); 
      showDashboard();
    } catch (err) {
      if (loginError) { 
        loginError.textContent = err.message; 
        loginError.classList.remove('hidden'); 
      }
    }
  });
}

function showDashboard() {
  if (loginView) loginView.classList.add('hidden');
  if (settingsView) settingsView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
  if (userActions) userActions.classList.remove('hidden');
  if (usernameLabel) usernameLabel.textContent = `Hello, ${localStorage.getItem('username')}`;
  
  const userRole = localStorage.getItem('role');
  if (settingsButton && (userRole === 'admin' || userRole === 'manager')) {
    settingsButton.classList.remove('hidden');
  }

  updateDashboardData();
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

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });
}

// ========================================================
// 🚀 ၂။ REAL-TIME MULTI-ESP LIFT LIST & REFRESH LOGIC
// ========================================================
async function updateDashboardData() {
  if (dashboardView && dashboardView.classList.contains('hidden')) return;
  try {
    const response = await fetch('/api/get-sensor');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawData = await response.json();

    if (rawData && rawData.length > 0) {
      window.allSensorData = [...rawData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      renderElevatorList(window.allSensorData);
      updateDeviceSelectOptions(window.allSensorData);
      applyFiltersAndRender();
    }
  } catch (error) {
    console.error("Error fetching sensor data:", error);
  }
}

function renderElevatorList(data) {
  const listContainer = document.getElementById('lift-status-list');
  if (!listContainer) return;

  const deviceKeys = [...new Set(data.map(item => item.device_id).filter(Boolean))];
  listContainer.innerHTML = ""; 

  deviceKeys.forEach(devId => {
    const devData = data.find(item => item.device_id === devId);
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
  const uniqueDevices = [...new Set(data.map(item => item.device_id).filter(Boolean))];
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
// 📊 ၃။ DATA EXPORT SYSTEM FUNCTIONS (ACCURATE DATE COMPARISON)
// ========================================================
function getFilteredExportData() {
  let exportData = [...window.allSensorData];
  const selectedDevice = document.getElementById('device-select')?.value;
  const startDateStr = document.getElementById('start-date')?.value; 
  const endDateStr = document.getElementById('end-date')?.value;

  if (selectedDevice) {
    exportData = exportData.filter(item => item.device_id === selectedDevice);
  }

  // 🎯 Start Date ကို Date Object သို့ပြောင်းပြီး ရက်စွဲသက်သက် နှိုင်းယှဉ်ခြင်း
  if (startDateStr && startDateStr.trim() !== "") {
    const startTarget = new Date(startDateStr);
    startTarget.setHours(0,0,0,0); // ညဉ့်နက် ၁၂ နာရီအဖြစ် သတ်မှတ်သည်

    exportData = exportData.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0,0,0,0);
      return itemDate.getTime() >= startTarget.getTime();
    });
  }

  // 🎯 End Date ကို Date Object သို့ပြောင်းပြီး ရက်စွဲသက်သက် နှိုင်းယှဉ်ခြင်း
  if (endDateStr && endDateStr.trim() !== "") {
    const endTarget = new Date(endDateStr);
    endTarget.setHours(0,0,0,0);

    exportData = exportData.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0,0,0,0);
      return itemDate.getTime() <= endTarget.getTime();
    });
  }

  return { exportData, selectedDevice };
}

function exportToCSV() {
  const { exportData, selectedDevice } = getFilteredExportData();
  if (exportData.length === 0) { alert("No data found for the selected criteria!"); return; }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Timestamp,Device ID,Temperature(C),Humidity(%),Door Status,Accel X,Accel Y,Accel Z\n";
  
  exportData.forEach(row => {
    let time = new Date(row.created_at).toLocaleString();
    csvContent += `"${time}","${row.device_id || ''}",${row.temperature},${row.humidity},"${row.door_status || ''}",${row.accel_x || 0},${row.accel_y || 0},${row.accel_z || 0}\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  
  const fileName = selectedDevice ? `elevator_report_${selectedDevice}_${new Date().toISOString().slice(0,10)}.csv` : `elevator_report_all_${new Date().toISOString().slice(0,10)}.csv`;
  link.setAttribute("download", fileName);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToJSON() {
  const { exportData, selectedDevice } = getFilteredExportData();
  if (exportData.length === 0) { alert("No data found for the selected criteria!"); return; }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  const fileName = selectedDevice ? `elevator_report_${selectedDevice}_${new Date().toISOString().slice(0,10)}.json` : `elevator_report_all_${new Date().toISOString().slice(0,10)}.json`;
  link.setAttribute("download", fileName);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========================================================
// ⚙️ ၄။ ADMIN SETTINGS - USER & DEVICE MANAGEMENT
// ========================================================
async function loadSettingsData() {
  const token = localStorage.getItem('token');
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
                Delete
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
        .map(log => log.device_id);
    }

    const resDevices = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${token}` } });
    if (resDevices.ok) {
      const devices = await resDevices.json();
      if(devicesTableBody) {
        devicesTableBody.innerHTML = devices.map(d => {
          const isOnline = activeDeviceIds.includes(d.device_key || d.id);
          const statusBadge = isOnline 
            ? `<span class="badge" style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">Online</span>`
            : `<span class="badge" style="background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 4px;">Offline</span>`;

          return `
            <tr>
              <td>${d.id}</td>
              <td><code>${d.device_key || d.id}</code></td>
              <td>${d.name || 'Unnamed Sensor'}</td>
              <td>${d.created_at ? new Date(d.created_at).toLocaleString() : 'Never'}</td>
              <td>${statusBadge}</td>
              <td>
                <button class="button button-danger btn-sm" style="color: #ffffff; background-color: #dc3545;" onclick="deleteDevice('${d.id}')">
                  Delete
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) { console.error("Error loading devices:", err); }
}

if (createUserForm) {
  createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username, password, role })
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to create user'); }
      createUserForm.reset();
      if (settingsError) { settingsError.textContent = "Account created successfully!"; settingsError.style.color = "green"; settingsError.classList.remove('hidden'); }
      loadSettingsData();
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

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deviceKey, name })
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to create device'); }
      createDeviceForm.reset();
      if (deviceError) { deviceError.textContent = "Device registered successfully!"; deviceError.style.color = "green"; deviceError.classList.remove('hidden'); }
      loadSettingsData();
    } catch (err) {
      if (deviceError) { deviceError.textContent = err.message; deviceError.style.color = "red"; deviceError.classList.remove('hidden'); }
    }
  });
}

window.deleteUser = async (id) => {
  if(!confirm("Are you sure to delete this user account?")) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/users?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  loadSettingsData();
};

window.deleteDevice = async (id) => {
  if(!confirm("Are you sure to delete this device?")) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/devices?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  loadSettingsData();
};

// ========================================================
// 🧼 ၅။ FILTER AND UI RENDER LOGIC (SAFE DATE OBJECT COMPARE)
// ========================================================
function applyFiltersAndRender() {
  let filteredData = [...window.allSensorData];
  const selectedDevice = document.getElementById('device-select')?.value;

  renderElevatorList(window.allSensorData);

  if (!selectedDevice) {
    resetUIElements();
    return;
  }
  filteredData = filteredData.filter(item => item.device_id === selectedDevice);

  const startDateStr = document.getElementById('start-date')?.value; 
  const endDateStr = document.getElementById('end-date')?.value;

  // 🎯 UI Filter - Start Date ကို တိကျသော Date Timestamp ဖြင့် စစ်ထုတ်ခြင်း
  if (startDateStr && startDateStr.trim() !== "") {
    const startTarget = new Date(startDateStr);
    startTarget.setHours(0,0,0,0);

    filteredData = filteredData.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0,0,0,0);
      return itemDate.getTime() >= startTarget.getTime();
    });
  }

  // 🎯 UI Filter - End Date ကို တိကျသော Date Timestamp ဖြင့် စစ်ထုတ်ခြင်း
  if (endDateStr && endDateStr.trim() !== "") {
    const endTarget = new Date(endDateStr);
    endTarget.setHours(0,0,0,0);

    filteredData = filteredData.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0,0,0,0);
      return itemDate.getTime() <= endTarget.getTime();
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
      document.getElementById('other-value').innerText = latest.device_id ? `Active: ${latest.device_id.toUpperCase()}` : "--";
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

// 🎯 ၆။ Event Bindings & Initialization
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