/**
 * API Client for Portal de Certificados Tributarios
 */

const API = {
  getToken() {
    return localStorage.getItem('cc_auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('cc_auth_token', token);
    } else {
      localStorage.removeItem('cc_auth_token');
    }
  },

  getHeaders(isMultipart = false) {
    const headers = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Public Endpoints
  async getPublicConfig() {
    const res = await fetch('/api/public/config');
    return res.json();
  },

  async getPublicYears(tipoTercero = '') {
    const query = tipoTercero ? `?tipoTercero=${encodeURIComponent(tipoTercero)}` : '';
    const res = await fetch(`/api/public/years${query}`);
    return res.json();
  },

  async searchCertificate(params) {
    const res = await fetch('/api/public/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async requestOtp(params) {
    const res = await fetch('/api/public/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw { ...data, status: res.status };
    }
    return data;
  },

  async verifyOtp(params) {
    const res = await fetch('/api/public/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw { ...data, status: res.status };
    }
    return data;
  },

  getDownloadUrl(params, inline = false) {
    const query = new URLSearchParams({
      tipoTercero: params.tipoTercero,
      nit: params.nit,
      tipoCertificado: params.tipoCertificado || '',
      year: params.year,
      inline: inline ? 'true' : 'false'
    });
    if (params.token) {
      query.set('token', params.token);
    }
    return `/api/public/download-pdf?${query.toString()}`;
  },

  // Auth Endpoints
  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
    this.setToken(data.token);
    return data;
  },

  async verifyAuth() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/verify', {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        this.setToken(null);
        return null;
      }
      return res.json();
    } catch (e) {
      this.setToken(null);
      return null;
    }
  },

  logout() {
    this.setToken(null);
  },

  // Admin Endpoints
  async getAdminConfig() {
    const res = await fetch('/api/admin/config', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Error al cargar configuración.');
    return res.json();
  },

  async updateAdminConfig(data) {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al actualizar configuración.');
    return result;
  },

  async testEmailConnection(data) {
    const res = await fetch('/api/admin/test-email', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al conectar con Google Workspace.');
    return result;
  },

  async uploadSignature(file) {
    const formData = new FormData();
    formData.append('signature', file);

    const res = await fetch('/api/admin/upload-signature', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al cargar firma digital.');
    return result;
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);

    const res = await fetch('/api/admin/upload-logo', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al cargar logotipo.');
    return result;
  },

  async getIssuanceDates() {
    const res = await fetch('/api/admin/issuance-dates', { headers: this.getHeaders() });
    return res.json();
  },

  async saveIssuanceDate(data) {
    const res = await fetch('/api/admin/issuance-dates', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al guardar fecha.');
    return result;
  },

  async uploadExcel(file, category, year) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('year', year);

    const res = await fetch('/api/admin/upload-excel', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al procesar archivo.');
    return result;
  },

  async getStats() {
    const res = await fetch('/api/admin/stats', { headers: this.getHeaders() });
    return res.json();
  },

  async getRecords(category, params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = category === 'retenciones'
      ? `/api/admin/records/retenciones?${query}`
      : `/api/admin/records/formulario220?${query}`;
    const res = await fetch(endpoint, { headers: this.getHeaders() });
    return res.json();
  },

  async deleteRecords(category, params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = category === 'retenciones'
      ? `/api/admin/records/retenciones?${query}`
      : `/api/admin/records/formulario220?${query}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  },

  // Maestro de Terceros Endpoints
  async getMaestroTerceros(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/admin/maestro-terceros?${query}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Error al consultar maestro de terceros.');
    return res.json();
  },

  async saveMaestroTercero(data) {
    const res = await fetch('/api/admin/maestro-terceros', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al guardar tercero.');
    return result;
  },

  async uploadMaestroExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload-maestro-terceros', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al procesar archivo de terceros.');
    return result;
  },

  async deleteMaestroTercero(id) {
    const res = await fetch(`/api/admin/maestro-terceros/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al eliminar tercero.');
    return result;
  },

  async clearMaestroTerceros() {
    const res = await fetch('/api/admin/maestro-terceros-clear', {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al limpiar maestro.');
    return result;
  }
};
