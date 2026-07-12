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

// 🔐 Local Backup Dictionary (language.json မတက်လာပါက အရန်သုံးရန်)
const internalAuthDictionary = {
  en: {
    loginFailed: "Login failed. Please check your credentials.",
    userGreeting: "Hello"
  },
  my: {
    loginFailed: "အကောင့်ဝင်ရောက်ခြင်း မအောင်မြင်ပါ။ အသုံးပြုသူအမည်နှင့် လျှို့ဝှက်နံပါတ်ကို ပြန်စစ်ပါ။",
    userGreeting: "မင်္ဂလာပါ"
  },
  th: {
    loginFailed: "การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูลของคุณ",
    userGreeting: "สวัสดี"
  },
  zh: {
    loginFailed: "登录失败。请检查您的凭据。",
    userGreeting: "你好"
  },
  vi: {
    loginFailed: "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
    userGreeting: "Xin chào"
  }
};

// 🌍 Centralized Auth Translation Helper
function getAuthTranslation(key, lang) {
  const targetLang = lang.toLowerCase();
  
  // 1. script.js ၏ Centralized window.languages ထဲတွင် ရှာဖတ်ခြင်း
  if (window.languages && window.languages[targetLang] && window.languages[targetLang][key]) {
    return window.languages[targetLang][key];
  }
  if (window.languages && window.languages['en'] && window.languages['en'][key]) {
    return window.languages['en'][key];
  }
  
  // 2. Backup Dictionary ထံမှ ဖတ်ခြင်း
  const backupLang = internalAuthDictionary[targetLang] || internalAuthDictionary['en'];
  return backupLang[key] || internalAuthDictionary['en'][key];
}

// 🔐 HANDLE LOGIN SYSTEM
if (window.loginForm) {
  window.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const currentLang = document.getElementById('language-select')?.value || 'en';
    
    try {
      // Vercel Path Safe: api/login
      const response = await fetch('api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) throw new Error('loginFailed');
   
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role || 'user'); 
      window.showDashboard();
    } catch (err) {
      if (window.loginError) { 
        window.loginError.textContent = getAuthTranslation('loginFailed', currentLang);
        window.loginError.style.color = "#dc3545";
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
 * အကောင့်ဝင်ထားသူ၏ အမည်ကို လက်ရှိရွေးချယ်ထားသော ဘာသာစကားအလိုက် ပြောင်းလဲပေးသည့် Helper function
 */
function updateUserGreeting() {
  if (!window.usernameLabel) return;
  const username = localStorage.getItem('username');
  if (!username) return;

  const currentLang = document.getElementById('language-select')?.value || 'en';
  const greetingText = getAuthTranslation('userGreeting', currentLang);
  
  window.usernameLabel.textContent = `${greetingText}, ${username}`;
}

// 🔐 Language Changed Event Listener 
// ဘာသာစကားပြောင်းလိုက်လျှင် Login UI စာသားများနှင့် Error message များကို တစ်ပြိုင်နက် Live Translate လုပ်ပေးရန်
window.addEventListener('languageChanged', (e) => {
  const currentLang = e.detail.lang.toLowerCase();
  
  // 1. User Greeting ကို Live-update လုပ်ခြင်း
  updateUserGreeting();
  
  // 2. ပြသနေဆဲ Login Error စာသားရှိပါက ချက်ချင်းဘာသာပြန်ပေးခြင်း
  if (window.loginError && !window.loginError.classList.contains('hidden')) {
    window.loginError.textContent = getAuthTranslation('loginFailed', currentLang);
  }

  // 3. index.html ရှိ Auth ဆိုင်ရာ static elements (ဥပမာ [data-i18n]) ကို ဗဟိုစနစ်ဖြင့် ဘာသာပြန်ခြင်း
  if (window.languages && window.languages[currentLang]) {
    const dict = window.languages[currentLang];
    document.querySelectorAll('#login-view [data-i18n], #user-actions [data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  }
});