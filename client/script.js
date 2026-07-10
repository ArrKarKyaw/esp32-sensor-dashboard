let allSensorData = []; // Server ကလာသမျှ ဒေတာအားလုံး သိမ်းဆည်းရန်
let historyChart = null;

// DOM Elements 
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userActions = document.getElementById('user-actions');
const usernameLabel = document.getElementById('username-label');
const logoutButton = document.getElementById('logout-button');

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
  if (dashboardView) dashboardView.classList.remove('hidden');
  if (userActions) userActions.classList.remove('hidden');
  if (usernameLabel) usernameLabel.textContent = `Hello, ${localStorage.getItem('username')}`;
  updateDashboardData();
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
    
    allSensorData = await response.json(); 

    if (allSensorData && allSensorData.length > 0) {
      // ဓာတ်လှေကား (ESP32) List တစ်စီးချင်းစီ ခွဲပြခြင်း
      renderElevatorList(allSensorData);

      // Select Box Options ထဲ စက်စာရင်းအလိုအလျောက်သွင်းခြင်း
      updateDeviceSelectOptions(allSensorData);

      // Screen ပေါ်မှာ ရွေးထားတဲ့ Lift အလိုက် Live data ဖြန်းပေးခြင်း
      applyFiltersAndRender();
    }
  } catch (error) {
    console.error("Error fetching sensor data:", error);
  }
}

// ဓာတ်လှေကားတစ်ခုချင်းစီကို Card သီးသန့်ဖြင့် List ခွဲပြမည့် လုပ်ဆောင်ချက်
function renderElevatorList(data) {
  const listContainer = document.getElementById('lift-status-list');
  if (!listContainer) return;

  // ဒေတာထဲမှ ရှိသမျှ unique ဖြစ်သော device_id (Lift ID မျိုးစုံ) ကို ရှာထုတ်ခြင်း
  const deviceKeys = [...new Set(data.map(item => item.device_id).filter(Boolean))];
  listContainer.innerHTML = ""; 

  deviceKeys.forEach(devId => {
    // ၎င်း ဓာတ်လှေကား၏ အသစ်ဆုံး Record တစ်ခုကို ရှာခြင်း
    const devData = data.find(item => item.device_id === devId);
    
    const isOpen = devData.door_status === "Open";
    const statusColor = isOpen ? "#ff6384" : "#4bc0c0"; // Open ရင် အနီ၊ Closed ရင် အစိမ်း

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
    
    // 💡 Lift Card လေးကို နှိပ်လိုက်ရင် အောက်က Dashboard မှာ အဲဒီ Lift ရဲ့ ဒေတာကို တန်းပြောင်းကြည့်ရန် Filter ချိတ်ခြင်း
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

// ၃။ Screen ပေါ်ရှိ Card များနှင့် Graph ထဲသို့ Data များ စစ်ထုတ်ထည့်သွင်းခြင်း
function applyFiltersAndRender() {
  let filteredData = [...allSensorData];

  // Device Filter Logic
  const selectedDevice = document.getElementById('device-select')?.value;
  if (selectedDevice) {
    filteredData = filteredData.filter(item => item.device_id === selectedDevice);
  }

  // Date Filter Logic
  const startDateStr = document.getElementById('start-date')?.value;
  const endDateStr = document.getElementById('end-date')?.value;
  if (startDateStr) {
    filteredData = filteredData.filter(item => new Date(item.created_at).getTime() >= new Date(startDateStr).getTime());
  }
  if (endDateStr) {
    filteredData = filteredData.filter(item => new Date(item.created_at).getTime() <= new Date(endDateStr).getTime());
  }

  // ရွေးချယ်ထားသော Lift အလိုက် ကတ်များထဲသို့ Live Data ထည့်ခြင်း
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

    // Graph ကိုပါ ရွေးချယ်ထားသည့် Lift အတိုင်း ပြောင်းလဲဆွဲပေးခြင်း
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
// 📊 ၄။ DATA EXPORT SYSTEM FUNCTIONS (FIXED)
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

// ၅။ Event Bindings
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filter-button')?.addEventListener('click', applyFiltersAndRender);
  document.getElementById('device-select')?.addEventListener('change', applyFiltersAndRender);
  
  // Export ခလုတ်များအား Event ချိတ်ဆက်ခြင်း
  document.getElementById('export-csv')?.addEventListener('click', exportToCSV);
  document.getElementById('export-json')?.addEventListener('click', exportToJSON);

  if (localStorage.getItem('token')) { showDashboard(); }
  setInterval(updateDashboardData, 5000); // ၅ စက္ကန့်တစ်ခါ real-time refresh လုပ်မည်
});