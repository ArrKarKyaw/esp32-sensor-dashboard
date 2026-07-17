// ========================================================
// 🚀 REAL-TIME MULTI-ESP LIFT LIST & REFRESH LOGIC
// ========================================================
window.updateDashboardData = async function() {
  if (window.dashboardView && window.dashboardView.classList.contains('hidden')) return;
  if (window.appState.getAllSensorData().length === 0) {
    setDashboardStatus('loading');
  }
  try {
    const response = await fetch('/api/get-sensor');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawData = await response.json();

    if (rawData && rawData.length > 0) {
      const normalizedData = rawData
        .filter(item => window.appState.getDeviceId(item) !== '')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      window.appState.setAllSensorData(normalizedData);

      if (normalizedData.length > 0) {
        renderElevatorList(normalizedData);
        updateDeviceSelectOptions(normalizedData);
        applyFiltersAndRender();
      }
      return;
    }

    window.appState.setAllSensorData([]);
    renderElevatorList([]);
    updateDeviceSelectOptions([]);
    resetUIElements();
    updateOverviewPanel([], document.getElementById('device-select')?.value || '');
    setChartEmptyState();
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    setDashboardStatus('offline', window.appState.getDictionary()?.dashboardLoadError || 'Unable to refresh live sensor data.');
  }
}

function getStatusMeta(status) {
  const dict = window.appState.getDictionary();
  const statuses = {
    loading: { className: 'status-loading', label: dict?.statusLoading || 'Loading' },
    online: { className: 'status-online', label: dict?.statusOnline || 'Online' },
    warning: { className: 'status-warning', label: dict?.statusWarning || 'Warning' },
    stale: { className: 'status-stale', label: dict?.statusStale || 'Stale' },
    offline: { className: 'status-offline', label: dict?.statusOffline || 'Offline' },
    'no-data': { className: 'status-nodata', label: dict?.statusNoData || 'No live data' },
  };

  return statuses[status] || statuses.offline;
}

function getDeviceHealth(record) {
  if (!record?.created_at) {
    return { status: 'offline', ...getStatusMeta('offline') };
  }

  const ageMinutes = (Date.now() - new Date(record.created_at).getTime()) / 60000;
  if (!Number.isFinite(ageMinutes) || ageMinutes > 15) {
    return { status: 'offline', ...getStatusMeta('offline') };
  }

  if (ageMinutes > 5) {
    return { status: 'stale', ...getStatusMeta('stale') };
  }

  if (record.door_status === 'Open') {
    return { status: 'warning', ...getStatusMeta('warning') };
  }

  return { status: 'online', ...getStatusMeta('online') };
}

function setDashboardStatus(status, message) {
  const badgeEl = document.getElementById('dashboard-status-badge');
  const messageEl = document.getElementById('dashboard-status-message');
  const meta = getStatusMeta(status);

  if (badgeEl) {
    badgeEl.className = `status-pill ${meta.className}`;
    badgeEl.textContent = meta.label;
  }

  if (messageEl) {
    messageEl.textContent = message || meta.label;
  }
}

function setChartEmptyState(message) {
  const dict = window.appState.getDictionary();
  const emptyStateEl = document.getElementById('chart-empty-state');
  if (!emptyStateEl) return;

  emptyStateEl.textContent = message || dict?.chartEmptyState || 'Select a device to view recent history.';
  emptyStateEl.classList.add('visible');
}

function hideChartEmptyState() {
  const emptyStateEl = document.getElementById('chart-empty-state');
  if (!emptyStateEl) return;
  emptyStateEl.classList.remove('visible');
}

function updateOverviewPanel(data, selectedDevice) {
  const allDevices = window.appState.getRegisteredDevices();
  const deviceIds = allDevices.length > 0
    ? allDevices.map((device) => window.appState.getDeviceKey(device)).filter(Boolean)
    : [...new Set(data.map((item) => window.appState.getDeviceId(item)).filter(Boolean))];

  const healthStatuses = deviceIds.map((deviceId) => {
    const latestRecord = data.find((item) => window.appState.getDeviceId(item) === deviceId);
    return getDeviceHealth(latestRecord).status;
  });

  const healthyCount = healthStatuses.filter((status) => status === 'online' || status === 'warning').length;
  const latestRecord = data[0] || null;

  const deviceCountEl = document.getElementById('overview-device-count');
  const onlineCountEl = document.getElementById('overview-online-count');
  const selectedDeviceEl = document.getElementById('overview-selected-device');
  const updatedEl = document.getElementById('overview-last-updated');
  const dict = window.appState.getDictionary();

  if (deviceCountEl) deviceCountEl.textContent = String(deviceIds.length);
  if (onlineCountEl) onlineCountEl.textContent = String(healthyCount);
  if (selectedDeviceEl) selectedDeviceEl.textContent = selectedDevice ? selectedDevice.toUpperCase() : '--';
  if (updatedEl) updatedEl.textContent = latestRecord?.created_at ? new Date(latestRecord.created_at).toLocaleString() : '--';

  if (!data.length) {
    setDashboardStatus('no-data');
    return;
  }

  if (healthStatuses.includes('warning')) {
    setDashboardStatus('warning', `${getStatusMeta('warning').label} · ${window.appState.getDeviceId(latestRecord).toUpperCase()}`);
    return;
  }

  if (healthStatuses.includes('stale')) {
    setDashboardStatus('stale', `${getStatusMeta('stale').label} · ${window.appState.getDeviceId(latestRecord).toUpperCase()}`);
    return;
  }

  if (healthyCount > 0) {
    setDashboardStatus('online', `${getStatusMeta('online').label} · ${window.appState.getDeviceId(latestRecord).toUpperCase()}`);
    return;
  }

  setDashboardStatus('offline', dict?.dashboardLoadError || 'Unable to refresh live sensor data.');
}

function renderElevatorList(data) {
  const listContainer = document.getElementById('lift-status-list');
  if (!listContainer) return;

  // Prefer the registered device list so offline devices remain visible in the UI.
  const allDevices = window.appState.getRegisteredDevices();
  
  if (allDevices.length === 0) {
    // စနစ်ထဲမှာ device မရှိသေးရင် logs ထဲကပဲ fallback အနေနဲ့ ယူမယ်
    var deviceKeys = [...new Set(data.map(item => window.appState.getDeviceId(item)).filter(Boolean))];
  } else {
    var deviceKeys = allDevices.map((device) => window.appState.getDeviceKey(device)).filter(Boolean);
  }

  listContainer.innerHTML = ""; 

  const dict = window.appState.getDictionary();
  
  const tempLabel = dict?.tempLabel || "Temp";
  const doorLabel = dict?.doorLabel || "Door";
  const offlineText = dict?.offlineBadge || "Offline"; // settings.js ထဲက offline စာသားကို ယူသုံးခြင်း

  if (deviceKeys.length === 0) {
    listContainer.innerHTML = `<p class="info-text" style="margin:0;">${dict?.statusNoData || 'No live data'}</p>`;
    return;
  }

  deviceKeys.forEach(devId => {
    // ထို device ရဲ့ နောက်ဆုံးရ log ဒေတာ ရှိမရှိ ရှာမယ်
    const devData = data.find(item => window.appState.getDeviceId(item) === devId);
    const healthMeta = getDeviceHealth(devData);
    
    // ဒေတာ ရှိရင် မူရင်းအတိုင်းပြမယ်၊ မရှိရင် Offline State ပြမယ်
    const isOpen = devData ? devData.door_status === "Open" : false;
    // Offline ဖြစ်နေရင် မီးခိုးရောင် (#6c757d) ပြမယ်
    const statusColor = devData ? (isOpen ? "#ff6384" : "#4bc0c0") : "#6c757d";

    const liftCard = document.createElement('div');
    liftCard.className = 'lift-status-card';
    liftCard.style.borderLeft = `5px solid ${statusColor}`;
    liftCard.style.cursor = 'pointer';
    liftCard.style.opacity = devData ? '1' : '0.6';
    
    const tempVal = (devData && devData.temperature && devData.temperature > 0) ? devData.temperature.toFixed(1) + "°C" : "--°C";
    const doorStatusText = devData ? (devData.door_status || "Unknown") : offlineText;
    
    liftCard.innerHTML = `
      <div class="lift-status-meta">
        <h4>${devId.toUpperCase()}</h4>
        <span class="status-pill ${healthMeta.className}">${healthMeta.label}</span>
      </div>
      <p>${tempLabel}: <b>${tempVal}</b></p>
      <p>${doorLabel}: <span style="color:${statusColor}; font-weight:bold;">${doorStatusText}</span></p>
    `;
    
    liftCard.onclick = () => {
      const deviceSelect = document.getElementById('device-select');
      if (deviceSelect) {
        deviceSelect.value = devId;
        if (typeof applyFiltersAndRender === 'function') applyFiltersAndRender();
      }
    };

    listContainer.appendChild(liftCard);
  });
}

function updateDeviceSelectOptions(data) {
  const deviceSelect = document.getElementById('device-select');
  if (!deviceSelect) return;
  const currentSelected = deviceSelect.value;
  
  const dict = window.appState.getDictionary();
  const allDevicesText = dict?.allDevices || "All devices";
  
  deviceSelect.innerHTML = `<option value="" style="color: #222222; background-color: #ffffff;">-- ${allDevicesText} --</option>`;
  const uniqueDevices = [...new Set(data.map(item => window.appState.getDeviceId(item)).filter(Boolean))];
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
  window.appState.clearHistoryChart();
  const dict = window.appState.getDictionary();
  
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

  const historyChart = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: { responsive: true }
  });
  window.appState.setHistoryChart(historyChart);
}

// ========================================================
// 🧼 FILTER AND UI RENDER LOGIC
// ========================================================
function applyFiltersAndRender() {
  let filteredData = [...window.appState.getAllSensorData()];
  const selectedDevice = document.getElementById('device-select')?.value;

  renderElevatorList(window.appState.getAllSensorData());
  updateOverviewPanel(window.appState.getAllSensorData(), selectedDevice || '');

  if (!selectedDevice) {
    resetUIElements();
    setChartEmptyState();
    return;
  }
  
  filteredData = filteredData.filter(item => window.appState.getDeviceId(item) === selectedDevice);

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

  const dict = window.appState.getDictionary();

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
      const activeDeviceId = window.appState.getDeviceId(latest);
      document.getElementById('other-value').innerText = activeDeviceId ? `Active: ${activeDeviceId.toUpperCase()}` : "--";
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

    hideChartEmptyState();
    updateHistoryChart(selectedDevice, filteredData);
  } else {
    resetUIElements();
    if (document.getElementById('other-value')) {
      document.getElementById('other-value').innerText = dict?.noDataYet || "No data found for the selected date range.";
    }
    setChartEmptyState(dict?.chartEmptyState || 'Select a device to view recent history.');
  }
}

function resetUIElements() {
  const dict = window.appState.getDictionary();
  if (document.getElementById('temperature-value')) document.getElementById('temperature-value').innerText = "-- °C";
  if (document.getElementById('humidity-value')) document.getElementById('humidity-value').innerText = "-- %";
  if (document.getElementById('pressure-value')) document.getElementById('pressure-value').innerText = "-- hPa";
  if (document.getElementById('other-value')) document.getElementById('other-value').innerText = dict?.selectDevicePrompt || "Please select a device";
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
    const languages = window.appState.getLanguages();
    if (!languages) return; 
    
    const code = selectedLangCode.toLowerCase();
    const dict = languages[code];
    if (!dict) return;

    // ✅ FIX: စာမျက်နှာတစ်ခုလုံးရှိ data-i18n Attribute ပါသမျှ (Dashboard ကော Settings ပါ) အားလုံးကို ဘာသာပြန်ပေးခြင်း
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

    const mainTitleEl = document.getElementById('main-title') || document.querySelector('title');
    if (mainTitleEl && dict.mainTitle) {
      mainTitleEl.textContent = dict.mainTitle;
    }

    updateOverviewPanel(window.appState.getAllSensorData(), document.getElementById('device-select')?.value || '');
    updateDeviceSelectOptions(window.appState.getAllSensorData());

    localStorage.setItem('selectedLanguage', code);

    // 📢 settings.js နှင့် auth.js တို့ဆီသို့ သတင်းပို့ရန် Event ထုတ်လွှင့်ခြင်း
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: code.toUpperCase() } }));
  };

  // 📥 language.json ဖိုင်ကို လှမ်းဖတ်ယူခြင်း
  try {
    const langResponse = await fetch('language.json?cache_bust=' + Date.now()); 
    if (!langResponse.ok) throw new Error("language.json loading failed");
    
    const languages = await langResponse.json();
    window.appState.setLanguages(languages);

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
