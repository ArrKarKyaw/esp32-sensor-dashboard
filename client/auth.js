// 🔐 Global UI Elements for Auth (Attach to window to share across files)
window.loginView = document.getElementById('login-view');
window.dashboardView = document.getElementById('dashboard-view');
window.settingsView = document.getElementById('settings-view');
window.loginForm = document.getElementById('login-form');
window.loginError = document.getElementById('login-error');
window.userActions = document.getElementById('user-actions');
window.usernameLabel = document.getElementById('username-label');
window.logoutButton = document.getElementById('logout-button');
window.settingsButton = document.getElementById('settings-button');

// 🔐 HANDLE LOGIN SYSTEM
if (window.loginForm) {
  window.loginForm.addEventListener('submit', async (e) => {
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
      if (window.loginError) { 
        window.loginError.textContent = err.message; 
        window.loginError.classList.remove('hidden'); 
      }
    }
  });
}

window.showDashboard = function() {
  if (window.loginView) window.loginView.classList.add('hidden');
  if (window.settingsView) window.settingsView.classList.add('hidden');
  if (window.dashboardView) window.dashboardView.classList.remove('hidden');
  if (window.userActions) window.userActions.classList.remove('hidden');
  
  // ဘာသာစကားအလိုက် ပြောင်းလဲပေးနိုင်ရန် မူရင်း String ပုံစံကို i18n helper ဖြင့် လိုက်လျောညီထွေဖြစ်အောင် ပြောင်းလဲခြင်း
  updateUserGreeting();
  
  const userRole = localStorage.getItem('role');
  if (window.settingsButton && (userRole === 'admin' || userRole === 'manager')) {
    window.settingsButton.classList.remove('hidden');
  }

  if (typeof window.updateDashboardData === 'function') {
    window.updateDashboardData();
  }
}

if (window.logoutButton) {
  window.logoutButton.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });
}

/**
 * အကောင့်ဝင်ထားသူ၏ အမည်ကို လက်ရှိရွေးချယ်ထားသော ဘာသာစကားအလိုက် 
 * နှုတ်ခွန်းဆက်စာသား (ဥပမာ - Hello, admin / မင်္ဂလာပါ admin) ပြောင်းလဲပေးသည့် Helper function
 */
function updateUserGreeting() {
  if (!window.usernameLabel) return;
  const username = localStorage.getItem('username');
  if (!username) return;

  const currentLang = document.getElementById('language-select')?.value || 'en';
  
  // ဘာသာစကားအလိုက် 'Hello' သို့မဟုတ် 'မင်္ဂလာပါ' ခွဲခြားသတ်မှတ်ခြင်း
  let greeting = 'Hello';
  if (currentLang === 'my') greeting = 'မင်္ဂလာပါ';
  else if (currentLang === 'th') greeting = 'สวัสดี';
  else if (currentLang === 'zh') greeting = '你好';
  else if (currentLang === 'vi') greeting = 'Xin chào';

  window.usernameLabel.textContent = `${greeting}, ${username}`;
}

// 🔐 Language Changed Event Listener 
// language-select ပြောင်းလိုက်တဲ့အခါ User Greeting ပါ လိုက်ပြောင်းပေးရန် ချိတ်ဆက်ခြင်း
window.addEventListener('languageChanged', (e) => {
  updateUserGreeting();
});