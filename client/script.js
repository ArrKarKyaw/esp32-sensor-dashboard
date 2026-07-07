// 🚀 Auto-detect API Base URL (Localရော Vercelပါ အလိုအလျောက်သိစေရန်)
const API_URL = window.location.origin;

const socket = io(API_URL);

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

// Handle Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginError.textContent = '';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save Token and Session info
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      // UI Changes on Success
      showDashboard();
    } catch (err) {
      console.error('Login Error:', err.message);
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    }
  });
}

function showDashboard() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!token) return;

  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  settingsView.classList.add('hidden');
  userActions.classList.remove('hidden');
  usernameLabel.textContent = `Hello, ${username}`;

  if (role === 'admin') {
    settingsButton.classList.remove('hidden');
  } else {
    settingsButton.classList.add('hidden');
  }
}

// Log out Action
if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });
}

// Navigation Controls
if (settingsButton) {
  settingsButton.addEventListener('click', () => {
    dashboardView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  });
}

if (settingsBackButton) {
  settingsBackButton.addEventListener('click', () => {
    settingsView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  });
}

// Check if already logged in on page load
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('token')) {
    showDashboard();
  }
});