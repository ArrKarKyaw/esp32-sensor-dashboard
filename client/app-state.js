window.appState = (() => {
  const state = {
    allSensorData: [],
    historyChart: null,
    languages: null,
    registeredDevices: [],
  };

  function getLanguageCode() {
    return (document.getElementById('language-select')?.value || 'en').toLowerCase();
  }

  function getLanguages() {
    return state.languages;
  }

  function setLanguages(languages) {
    state.languages = languages;
    window.languages = languages;
  }

  function getDictionary() {
    const languages = getLanguages();
    const code = getLanguageCode();
    return (languages && languages[code]) ? languages[code] : null;
  }

  function getDeviceId(item) {
    if (!item) return '';
    return item.device_id || '';
  }

  function getDeviceKey(device) {
    if (!device) return '';
    return device.device_key || device.id || '';
  }

  function getAllSensorData() {
    return state.allSensorData;
  }

  function setAllSensorData(data) {
    state.allSensorData = Array.isArray(data) ? data : [];
    window.allSensorData = state.allSensorData;
  }

  function getRegisteredDevices() {
    return state.registeredDevices;
  }

  function setRegisteredDevices(devices) {
    state.registeredDevices = Array.isArray(devices) ? devices : [];
    window.registeredDevices = state.registeredDevices;
  }

  function getHistoryChart() {
    return state.historyChart;
  }

  function setHistoryChart(chartInstance) {
    state.historyChart = chartInstance;
    window.historyChart = chartInstance;
  }

  function clearHistoryChart() {
    if (state.historyChart) {
      state.historyChart.destroy();
      state.historyChart = null;
      window.historyChart = null;
    }
  }

  return {
    getAllSensorData,
    getDeviceId,
    getDeviceKey,
    getDictionary,
    getHistoryChart,
    getLanguageCode,
    getLanguages,
    getRegisteredDevices,
    setAllSensorData,
    setHistoryChart,
    setLanguages,
    setRegisteredDevices,
    clearHistoryChart,
  };
})();
