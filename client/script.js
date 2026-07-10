let allSensorData = []; // Server ကလာသမျှ ဒေတာအားလုံး သိမ်းဆည်းရန်
let historyChart = null;

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
      localStorage.setItem('role', data.role || 'user'); // Role ကိုပါ မှတ်ထားမည်
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
  
  // 🎯 Admin သို့မဟုတ် Manager ဖြစ်မှ Settings ခလုတ်ကို ပေါ်အောင်လုပ်ခြင်း
  const userRole = localStorage.getItem('role');
  if (settingsButton && (userRole === 'admin' || userRole === 'manager')) {
    settingsButton.classList.remove('hidden');
  }

  updateDashboardData();
}

// ⚙️ Navigation: Dashboard -> Settings
if (settingsButton) {
  settingsButton.addEventListener('click', () => {
    if (dashboardView) dashboardView.classList.add('hidden');
    if (settingsView) settingsView.classList.remove('hidden');
    loadSettingsData(); // User နှင့် Device စာရင်းများကို ဆွဲယူပြသရန်
  });
}

// ⚙️ Navigation: Settings -> Dashboard Back
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
    // 🎯 FIX: လမ်းကြောင်းကို /api/sensor (POST ဒေတာတွေအကုန်ပြန်ဆွဲထုတ်ရန်) သို့ ပြောင်းလဲခြင်း
    const response = await fetch('/api/sensor');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    // Express Server ဆီကကျလာတဲ့ JSON array ကို လက်ခံခြင်း
    const rawData = await response.json();
    allSensorData = Array.isArray(rawData) ? rawData : (rawData.data ? [rawData.data] : []);

    if (allSensorData && allSensorData.length > 0) {
      renderElevatorList(allSensorData);
      updateDeviceSelectOptions(allSensorData);
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
    
    liftCard.innerHTML = `
      <h4 style="margin:0 0 5px 0; color:#01919d; font-size:1.1rem;">${devId.toUpperCase()}</h4>
      <p style="margin:3px 0; font-size:0.9rem;">Temp: <b>${devData.temperature ? devData.temperature.toFixed(1) : '0'}°C</b></p>
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
  if (!deviceSelect || deviceSelect.options.length > 1) return; 

  const uniqueDevices = [...new Set(data.map(item => item.device_id).filter(Boolean))];
  uniqueDevices.forEach(devKey => {
    let opt = document.createElement('option');
    opt.value = devKey;
    opt.innerHTML = devKey.toUpperCase();
    deviceSelect.appendChild(opt);
  });
}

function applyFiltersAndRender() {
  let filteredData = [...allSensorData];

  const selectedDevice = document.getElementById('device-select')?.value;
  if (selectedDevice) {
    filteredData = filteredData.filter(item => item.device_id === selectedDevice);
  }

  const startDateStr = document.getElementById('start-date')?.value;
  const endDateStr = document.getElementById('end-date')?.value;
  if (startDateStr) {
    filteredData = filteredData.filter(item => new Date(item.created_at).getTime() >= new Date(startDateStr).getTime());
  }
  if (endDateStr) {
    filteredData = filteredData.filter(item => new Date(item.created_at).getTime() <= new Date(endDateStr).getTime());
  }

  if (filteredData.length > 0) {
    const latest = filteredData[0];
    
    if(document.getElementById('temperature-value')) document.getElementById('temperature-value').innerText = latest.temperature ? latest.temperature.toFixed(1) + " °C" : "-- °C";
    if(document.getElementById('humidity-value')) document.getElementById('humidity-value').innerText = latest.humidity ? latest.humidity.toFixed(1) + " %" : "-- %";
    if(document.getElementById('pressure-value')) document.getElementById('pressure-value').innerText = latest.pressure ? latest.pressure.toFixed(1) + " hPa" : "-- hPa";
    if(document.getElementById('other-value')) document.getElementById('other-value').innerText = latest.device_id ? `Active: ${latest.device_id.toUpperCase()}` : "--";
    
    if(document.getElementById('door-status-value')) {
      document.getElementById('door-status-value').innerText = latest.door_status || "--";
      document.getElementById('door-status-value').style.color = latest.door_status === "Open" ? "#ff6384" : "#4bc0c0";
    }
    
    if(document.getElementById('vibration-value')) {
      document.getElementById('vibration-value').innerHTML = `
        X: <b>${latest.accel_x?.toFixed(2) || '0.00'}</b> m/s² | 
        Y: <b>${latest.accel_y?.toFixed(2) || '0.00'}</b> m/s² | 
        Z: <b>${latest.accel_z?.toFixed(2) || '0.00'}</b> m/s²
      `;
    }

    updateHistoryChart(filteredData);
  }
}

function updateHistoryChart(sensorLogs) {
  const ctx = document.getElementById('history-chart');
  if (!ctx) return;

  const reversedLogs = [...sensorLogs].slice(0, 20).reverse();
  const labels = reversedLogs.map(log => new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const tempDataset = reversedLogs.map(log => log.temperature);
  const humidDataset = reversedLogs.map(log => log.humidity);

  if (historyChart) {
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = tempDataset;
    historyChart.data.datasets[1].data = humidDataset;
    historyChart.update('none');
  } else {
    historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Temperature (°C)', data: tempDataset, borderColor: '#ff6384', borderWidth: 2, tension: 0.2 },
          { label: 'Humidity (%)', data: humidDataset, borderColor: '#36a2eb', borderWidth: 2, tension: 0.2 }
        ]
      },
      options: { responsive: true }
    });
  }
}

// ========================================================
// 📊 ၃။ DATA EXPORT SYSTEM FUNCTIONS
// ========================================================
function exportToCSV() {
  if (allSensorData.length === 0) { alert("No data to export!"); return; }
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Timestamp,Device ID,Temperature(C),Humidity(%),Door Status,Accel X,Accel Y,Accel Z\n"; 
  allSensorData.forEach(row => {
    let time = new Date(row.created_at).toLocaleString();
    csvContent += `"${time}","${row.device_id || ''}",${row.temperature},${row.humidity},"${row.door_status || ''}",${row.accel_x || 0},${row.accel_y || 0},${row.accel_z || 0}\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `elevator_report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToJSON() {
  if (allSensorData.length === 0) { alert("No data to export!"); return; }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allSensorData, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `elevator_report_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========================================================
// ⚙️ ၄။ ADMIN SETTINGS, USER & DEVICE CREATION SYSTEM (FIXED)
// ========================================================
async function loadSettingsData() {
  const token = localStorage.getItem('token');
  
  // ဌာနတွင်း အကောင့်များစာရင်း ဆွဲယူခြင်း
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
            <td><button class="button button-danger btn-sm" onclick="deleteUser(${u.id})">Delete</button></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) { console.error("Error loading users:", err); }

  // 🎯 FIX: လမ်းကြောင်းကို /api/sensor (GET devices ရန်) သို့ ညွှန်းပေးခြင်း
  try {
    const resDevices = await fetch('/api/sensor', { headers: { 'Authorization': `Bearer ${token}` } });
    if (resDevices.ok) {
      const devices = await resDevices.json();
      if(devicesTableBody) {
        // Express Server ကကျလာမယ့် devices array ကို Loop ပတ်ပြသခြင်း
        devicesTableBody.innerHTML = (Array.isArray(devices) ? devices : []).map(d => `
          <tr>
            <td>${d.id}</td>
            <td><code>${d.device_key}</code></td>
            <td>${d.name}</td>
            <td>${d.created_at ? new Date(d.created_at).toLocaleString() : 'Never'}</td>
            <td>-- °C</td>
            <td>-- %</td>
            <td>-- hPa</td>
            <td><button class="button button-danger btn-sm" onclick="deleteDevice('${d.id}')">Delete</button></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) { console.error("Error loading devices:", err); }
}

// Handle: Create User Account
if (createUserForm) {
  createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-email').value.trim();
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email, username, password, role })
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

// Handle: Register New Device
if (createDeviceForm) {
  createDeviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const deviceKey = document.getElementById('new-device-key').value.trim();
    const name = document.getElementById('new-device-name').value.trim();
    const token = localStorage.getItem('token');

    try {
      // 🎯 FIX: လမ်းကြောင်းကို /api/sensor နှင့် Payload ကို device_key သို့ ပြောင်းလဲခြင်း
      const response = await fetch('/api/sensor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ device_key: deviceKey, name }) 
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

// Delete functions to global scope for button clicks
window.deleteUser = async (id) => {
  if(!confirm("Are you sure to delete this user account?")) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/users?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  loadSettingsData();
};

window.deleteDevice = async (id) => {
  if(!confirm("Are you sure to delete this device?")) return;
  const token = localStorage.getItem('token');
  // 🎯 FIX: String ID Type (ဥပမာ- 'lift-01') ကိုပါ Delete လုပ်နိုင်ရန် ညွှန်းပေးခြင်း
  await fetch(`/api/sensor?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  loadSettingsData();
};

// ========================================================
// 🎯 ၅။ Event Bindings & Initialization (အပြီးသတ် ဗားရှင်း)
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  
  // (က) Dashboard Filter & Export ခလုတ်များ ချိတ်ဆက်ခြင်း
  document.getElementById('filter-button')?.addEventListener('click', applyFiltersAndRender);
  document.getElementById('device-select')?.addEventListener('change', applyFiltersAndRender);
  document.getElementById('export-csv')?.addEventListener('click', exportToCSV);
  document.getElementById('export-json')?.addEventListener('click', exportToJSON);

  // (ခ) Theme Toggle (Dark/Light) ခလုတ်ကို Event Bind လုပ်ခြင်း
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

  // (ဂ) Login အခြေအနေစစ်ဆေးပြီး Dashboard ပေါ်မပေါ် ဆုံးဖြတ်ခြင်း
  if (localStorage.getItem('token')) { 
    showDashboard(); 
  } else {
    if (loginView) loginView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (userActions) userActions.classList.add('hidden');
  }

  // (ဃ) ဒေတာများကို ၅ စက္ကန့်တစ်ခါ real-time refresh စတင်လုပ်ဆောင်ခြင်း
  setInterval(updateDashboardData, 5000); 
});