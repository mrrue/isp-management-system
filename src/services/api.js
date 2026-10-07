const API_BASE = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('isp_auth_token');
  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to JSON
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('isp_auth_token');
    localStorage.removeItem('isp_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API request failed.');
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed.');
  }

  return response;
}

export const api = {
  get: (endpoint, params) => {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val);
        }
      });
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }
    return request(url, { method: 'GET' });
  },
  post: (endpoint, body) => {
    const isFormData = body instanceof FormData;
    return request(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  },
  put: (endpoint, body) => {
    const isFormData = body instanceof FormData;
    return request(endpoint, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body)
    });
  },
  delete: (endpoint) => {
    return request(endpoint, { method: 'DELETE' });
  }
};
