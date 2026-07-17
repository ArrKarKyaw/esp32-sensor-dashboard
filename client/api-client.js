window.apiClient = (() => {
  function getToken() {
    return localStorage.getItem('token');
  }

  function getRole() {
    return localStorage.getItem('role') || 'user';
  }

  function getUsername() {
    return localStorage.getItem('username');
  }

  function setSession(session) {
    localStorage.setItem('token', session.token);
    localStorage.setItem('username', session.username);
    localStorage.setItem('role', session.role || 'user');
  }

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  }

  function buildHeaders(options = {}) {
    const headers = { ...(options.headers || {}) };

    if (options.json !== false && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.auth) {
      const token = getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: buildHeaders(options),
      body: options.body,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error((payload && payload.error) || 'Request failed');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function getJson(url, options = {}) {
    return request(url, { ...options, method: 'GET' });
  }

  function postJson(url, data, options = {}) {
    return request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  function deleteJson(url, options = {}) {
    return request(url, { ...options, method: 'DELETE' });
  }

  function canManageDevices() {
    return ['admin', 'manager'].includes(getRole());
  }

  function canManageUsers() {
    return getRole() === 'admin';
  }

  return {
    canManageDevices,
    canManageUsers,
    clearSession,
    deleteJson,
    getJson,
    getRole,
    getToken,
    getUsername,
    postJson,
    request,
    setSession,
  };
})();
