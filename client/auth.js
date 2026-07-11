// 🔐 DOM Elements for Auth
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const settingsView = document.getElementById('settings-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userActions = document.getElementById('user-actions');
const usernameLabel = document.getElementById('username-label');
const logoutButton = document.getElementById('logout-button');
const settingsButton = document.getElementById('settings-button');

// 🔐 HANDLE LOGIN SYSTEM
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
      window.showDashboard();
    } catch (err) {
      if (loginError) { 
        loginError.textContent = err.message; 
        loginError.classList.remove('hidden'); 
      }
    }
  });
}

window.showDashboard = function() {
  if (loginView) loginView.classList.add('hidden');
  if (settingsView) settingsView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
  if (userActions) userActions.classList.remove('hidden');
  if (usernameLabel) usernameLabel.textContent = `Hello, ${localStorage.getItem('username')}`;
  
  const userRole = localStorage.getItem('role');
  if (settingsButton && (userRole === 'admin' || userRole === 'manager')) {
    settingsButton.classList.remove('hidden');
  }

  if (typeof window.updateDashboardData === 'function') {
    window.updateDashboardData();
  }
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });
}