// 🎯 Global Variables 
window.allSensorData = []; 
window.historyChart = null;

// 🌐 5-Language JSON Dictionary System (ပြင်ပ JSON ဖိုင်မှ Data သိမ်းဆည်းရန် Variable)
//let languages = null;
window.languages = null;
// 🛠️ Helper to Safely get Device ID
function getDevId(item) {
  if (!item) return '';
  return item.device_id || item.ce_id || '';
}

// ========================================================
// 🚀 REAL-TIME MULTI-ESP LIFT LIST & REFRESH LOGIC
// ========================================================
window.updateDashboardData = async function() {
  if (window.dashboardView && window.dashboardView.classList.contains('hidden')) return;
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

  // လက်ရှိ ရွေးချယ်ထားသော ဘာသာစကားအတိုင်း Dynamic စာသားများ ရယူရန်
  const currentLang = (document.getElementById('language-select')?.value || 'en').toLowerCase();
  const dict = (languages && languages[currentLang]) ? languages[currentLang] : null;
  
  const tempLabel = dict?.tempLabel || "Temp";
  const doorLabel = dict?.doorLabel || "Door";
  const unknownText = "Unknown";

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
      <p style="margin:3px 0; font-size:0.9rem;">${tempLabel}: <b>${tempVal}</b></p>
      <p style="margin:3px 0; font-size:0.9rem;">${doorLabel}: <span style="color:${statusColor}; font-weight:bold;">${devData.door_status || unknownText}</span></p>
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
  
  const currentLang = (document.getElementById('language-select')?.value || 'en').toLowerCase();
  const allDevicesText = (languages && languages[currentLang]) ? languages[currentLang].allDevices : "All devices";
  
  deviceSelect.innerHTML = `<option value="" style="color: #222222; background-color: #ffffff;">-- ${allDevicesText} --</option>`;
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

  // Chart Labels များကိုပါ ဘာသာစကားအလိုက် Dynamic ပြောင်းလဲရန်
  const currentLang = (document.getElementById('language-select')?.value || 'en').toLowerCase();
  const dict = (languages && languages[currentLang]) ? languages[currentLang] : null;
  
  const labelTemp = (dict?.tempLabel || 'Temperature') + ' (°C)';
  const labelHum = (dict?.humLabel || 'Humidity') + ' (%)';

  let datasets = [];
  if (deviceId === 'lift-01' || deviceId === 'lift-03') {
    datasets = [
      { label: labelTemp, data: reversedLogs.map(log => log.temperature || null), borderColor: '#ff6384', borderWidth: 2, tension: 0.2 },
      { label: labelHum, data: reversedLogs.map(log => log.humidity || null), borderColor: '#36a2eb', borderWidth: 2, tension: 0.2 }
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
// 🧼 FILTER AND UI RENDER LOGIC
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

  const currentLang = (document.getElementById('language-select')?.value || 'en').toLowerCase();
  const dict = (languages && languages[currentLang]) ? languages[currentLang] : null;

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
      // JSON ထဲတွင် သတ်မှတ်ထားသော ဒေတာမရှိသည့်စာသားကို သုံးရန်
      document.getElementById('other-value').innerText = dict?.noDataYet || "No data found for the selected date range.";
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

// 🎯 Event Bindings & Initialization (DOM Fully Loaded Safe Zone)
window.addEventListener('DOMContentLoaded', async () => {
  window.settingsButton = document.getElementById('settings-button');
  window.settingsBackButton = document.getElementById('settings-back-button');
  window.dashboardView = document.getElementById('dashboard-view');
  window.settingsView = document.getElementById('settings-view');

  if (typeof window.initSettingsEvents === 'function') {
    window.initSettingsEvents();
  }

  // ⚙️ Navigation Setup
  if (window.settingsButton) {
    window.settingsButton.addEventListener('click', () => {
      if (window.dashboardView) window.dashboardView.classList.add('hidden');
      if (window.settingsView) window.settingsView.classList.remove('hidden');
      if (typeof window.loadSettingsData === 'function') {
        window.loadSettingsData(); 
      }
    });
  }

  if (window.settingsBackButton) {
    window.settingsBackButton.addEventListener('click', () => {
      if (typeof window.showDashboard === 'function') {
        window.showDashboard();
      }
    });
  }

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
  
  document.getElementById('export-csv')?.addEventListener('click', () => {
    if (typeof window.exportToCSV === 'function') window.exportToCSV();
  });
  document.getElementById('export-json')?.addEventListener('click', () => {
    if (typeof window.exportToJSON === 'function') window.exportToJSON();
  });

  // 🌓 Theme Toggle
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

  // 🌐 external language.json ကို လှမ်းယူပြီး UI update လုပ်မည့် စနစ်သစ်
  const langSelect = document.getElementById('language-select') || document.getElementById('lang-select') || document.querySelector('select:not([id="device-select"])');
  
  const changeLanguageSystem = (selectedLangCode) => {
    if (!languages) return; 
    
    const code = selectedLangCode.toLowerCase();
    const dict = languages[code];
    if (!dict) return;

    // HTML DOM ထဲက data-i18n Attribute ရှိတဲ့ element အားလုံးကို JSON စာသားနဲ့ အစားထိုးခြင်း
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (el.id === 'export-csv' || el.id === 'export-json') {
          el.textContent = `📥 ${dict[key]}`; 
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Web Page ရဲ့ Head Title ကိုပါ JSON ထဲက mainTitle စာသားအတိုင်း ပြောင်းပေးခြင်း
    const mainTitleEl = document.getElementById('main-title') || document.querySelector('title');
    if (mainTitleEl && dict.mainTitle) {
      mainTitleEl.textContent = dict.mainTitle;
    }

    // Dropdown settings text တွေကို Reload ဖြစ်စေပြီး စာသားပြောင်းပေးခြင်း
    if (window.allSensorData && window.allSensorData.length > 0) {
      updateDeviceSelectOptions(window.allSensorData);
    }

    // Page Refresh ဖြစ်လည်း ရွေးထားတာ မပျောက်သွားအောင် သိမ်းထားခြင်း
    localStorage.setItem('selectedLanguage', code);

    // 📢 settings.js နှင့် auth.js တို့ဆီသို့ သတင်းပေးပို့ရန် Event ထုတ်လွှင့်ခြင်း
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: code.toUpperCase() } }));
  };

 // 📥 language.json ဖိုင်ကို လှမ်းဖတ်ယူခြင်း (Vercel Fixed)
  try {
    // Vercel ပေါ်တွင် Body အလွတ်ပြန်မလာစေရန် ?cache_bust= ကို ဖယ်ရှားပြီး တိုက်ရိုက်လမ်းကြောင်းပြောင်းထားပါသည်
    const langResponse = await fetch('/language.json'); 
    if (!langResponse.ok) throw new Error("language.json loading failed with status");
    
    // Global variable အဖြစ် Window object ပေါ်သို့ တိုက်ရိုက်သတ်မှတ်ခြင်း
    window.languages = await langResponse.json();

    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        changeLanguageSystem(e.target.value);
      });

      const savedLang = localStorage.getItem('selectedLanguage') || langSelect.value || 'en';
      langSelect.value = savedLang.toLowerCase();
      changeLanguageSystem(savedLang);
    }
  } catch (error) {
    console.error("Error initializing language system from JSON:", error);
  }

  // Auth & Initial Load Handling
  if (localStorage.getItem('token')) { 
    if (typeof window.showDashboard === 'function') window.showDashboard();
  } else {
    if (window.loginView) window.loginView.classList.remove('hidden');
    if (window.dashboardView) window.dashboardView.classList.add('hidden');
    if (window.userActions) window.userActions.classList.add('hidden');
  }

  // Real-time loop
  setInterval(window.updateDashboardData, 5000); 
});