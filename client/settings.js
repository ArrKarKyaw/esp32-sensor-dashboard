// ⚙️ DOM Elements Re-binding for Settings Module
const createUserForm = document.getElementById('create-user-form');
const createDeviceForm = document.getElementById('create-device-form');
const settingsError = document.getElementById('settings-error');
const deviceError = document.getElementById('device-error');
const usersTableBody = document.getElementById('users-table-body');
const devicesTableBody = document.getElementById('devices-table-body');

// ⚙️ ADMIN SETTINGS - USER & DEVICE MANAGEMENT
window.loadSettingsData = async function() {
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
        .map(log => log.device_id || log.ce_id || '');
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
      window.loadSettingsData();
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
      window.loadSettingsData();
    } catch (err) {
      if (deviceError) { deviceError.textContent = err.message; deviceError.style.color = "red"; deviceError.classList.remove('hidden'); }
    }
  });
}

window.deleteUser = async (id) => {
  if(!confirm("Are you sure to delete this user account?")) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/users?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  window.loadSettingsData();
};

window.deleteDevice = async (id) => {
  if(!confirm("Are you sure to delete this device?")) return;
  const token = localStorage.getItem('token');
  await fetch(`/api/devices?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  window.loadSettingsData();
};