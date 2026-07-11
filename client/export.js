// 📊 DATA EXPORT SYSTEM FUNCTIONS (SUPABASE DIRECT FETCH)
window.exportToCSV = async function() {
  const selectedDevice = document.getElementById('device-select')?.value || '';
  const startDate = document.getElementById('start-date')?.value || '';
  const endDate = document.getElementById('end-date')?.value || '';

  if (!startDate || !endDate) {
    alert("ကျေးဇူးပြု၍ ဘယ်နေ့ကနေ ဘယ်နေ့အထိ ထုတ်ချင်လဲဆိုတာ Start Date နှင့် End Date အရင်ရွေးပေးပါခင်ဗျာ။");
    return;
  }

  try {
    let url = `/api/get-sensor?deviceId=${selectedDevice}&startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Supabase မှ ဒေတာဆွဲယူ၍မရပါ');
    const exportData = await response.json();

    if (!exportData || exportData.length === 0) {
      alert("ရွေးချယ်ထားသော ရက်စွဲအတွင်း မည်သည့် Data မှ မရှိပါရှင်။");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Device ID,Temperature(C),Humidity(%),Door Status,Accel X,Accel Y,Accel Z\n";
    
    exportData.reverse().forEach(row => {
      let time = new Date(row.created_at).toLocaleString();
      let devId = row.device_id || row.ce_id || '';
      csvContent += `"${time}","${devId}",${row.temperature || 0},${row.humidity || 0},"${row.door_status || ''}",${row.accel_x || 0},${row.accel_y || 0},${row.accel_z || 0}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const fileName = selectedDevice ? `Supabase_Report_${selectedDevice}_${startDate}_to_${endDate}.csv` : `Supabase_Report_All_${startDate}_to_${endDate}.csv`;
    link.setAttribute("download", fileName);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Export CSV Error:", error);
    alert("ဒေတာထုတ်ယူရာတွင် အမှားအယွင်းရှိနေပါသည်- " + error.message);
  }
}

window.exportToJSON = async function() {
  const selectedDevice = document.getElementById('device-select')?.value || '';
  const startDate = document.getElementById('start-date')?.value || '';
  const endDate = document.getElementById('end-date')?.value || '';

  if (!startDate || !endDate) {
    alert("ကျေးဇူးပြု၍ Start Date နှင့် End Date အရင်ရွေးပေးပါခင်ဗျာ။");
    return;
  }

  try {
    let url = `/api/get-sensor?deviceId=${selectedDevice}&startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Supabase မှ ဒေတာဆွဲယူ၍မရပါ');
    const exportData = await response.json();

    if (!exportData || exportData.length === 0) {
      alert("ရွေးချယ်ထားသော ရက်စွဲအတွင်း မည်သည့် Data မှ မရှိပါရှင်။");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    
    const fileName = selectedDevice ? `Supabase_Report_${selectedDevice}_${startDate}_to_${endDate}.json` : `Supabase_Report_All_${startDate}_to_${endDate}.json`;
    link.setAttribute("download", fileName);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Export JSON Error:", error);
    alert("ဒေတာထုတ်ယူရာတွင် အမှားအယွင်းရှိနေပါသည်- " + error.message);
  }
}