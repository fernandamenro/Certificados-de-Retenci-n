const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure data directory exists (handled safely for serverless environments)
try {
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(config.UPLOADS_DIR)) {
    fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  // Silent fallback for read-only environments
}

// Initial empty state structure
const defaultState = {
  agentConfig: {
    razonSocial: 'Primavera Urbana Centro Comercial y Empresarial',
    nit: '901003351',
    dv: '2',
    direccion: 'Calle 15 No. 40 - 01',
    ciudad: 'Villavicencio',
    departamento: 'Meta',
    telefono: '310 689 0750',
    email: 'contabilidad@primaveraurbana.com.co',
    representanteLegal: 'Constanza Gómez Hernández',
    cargoRepresentante: 'Representante Legal / Administradora',
    contador: 'Luisa Fernanda Méndez Rodríguez',
    tarjetaProfesional: 'T.P. 184592-T',
    ciudadExpedicion: 'Villavicencio',
    firmaDigitalBase64: null,
    logoBase64: null,
    gworkspaceEmail: 'contabilidad@primaveraurbana.com.co',
    gworkspaceAppPassword: '',
    gworkspaceSmtpHost: 'smtp.gmail.com',
    gworkspaceSmtpPort: 465
  },
  issuanceDates: [
    { year: 2024, certType: 'RENTA', dateStr: '15 de marzo de 2025' },
    { year: 2024, certType: 'IVA', dateStr: '15 de marzo de 2025' },
    { year: 2024, certType: 'ICA', dateStr: '15 de marzo de 2025' },
    { year: 2024, certType: 'F220', dateStr: '20 de marzo de 2025' },
    { year: 2025, certType: 'RENTA', dateStr: '14 de marzo de 2026' },
    { year: 2025, certType: 'IVA', dateStr: '14 de marzo de 2026' },
    { year: 2025, certType: 'ICA', dateStr: '14 de marzo de 2026' },
    { year: 2025, certType: 'F220', dateStr: '18 de marzo de 2026' }
  ],
  users: [],
  retenciones: [],
  formulario220: [],
  maestroTerceros: []
};

class JsonDB {
  constructor() {
    this.filePath = config.DB_FILE;
    this.data = this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      this.save(defaultState);
      return JSON.parse(JSON.stringify(defaultState));
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      
      // Auto-load signature and emblem logo if not already set, and merge default agent config
      if (parsed.agentConfig) {
        parsed.agentConfig = {
          ...defaultState.agentConfig,
          ...parsed.agentConfig
        };
        // Remove legacy Resend fields if present
        delete parsed.agentConfig.resendApiKey;
        delete parsed.agentConfig.resendFromEmail;

        if (!parsed.agentConfig.firmaDigitalBase64) {
          const sigPath = path.join(__dirname, '..', 'public', 'signature.png');
          if (fs.existsSync(sigPath)) {
            parsed.agentConfig.firmaDigitalBase64 = `data:image/png;base64,${fs.readFileSync(sigPath).toString('base64')}`;
          }
        }
        if (!parsed.agentConfig.logoBase64) {
          const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
          if (fs.existsSync(logoPath)) {
            parsed.agentConfig.logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
          }
        }
      }
      return parsed;
    } catch (err) {
      console.error('Error loading database file, falling back to default:', err);
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  save(dataToSave = this.data) {
    try {
      const tmpFile = `${this.filePath}.tmp`;
      const serialized = JSON.stringify(dataToSave, null, 2);
      fs.writeFileSync(tmpFile, serialized, 'utf8');
      fs.renameSync(tmpFile, this.filePath);
    } catch (err) {
      console.warn('Advertencia al guardar archivo local (entorno de sólo lectura):', err.message);
    }
  }

  // Agent Configuration
  getAgentConfig() {
    return this.data.agentConfig || defaultState.agentConfig;
  }

  updateAgentConfig(newConfig) {
    this.data.agentConfig = {
      ...this.getAgentConfig(),
      ...newConfig
    };
    this.save();
    return this.data.agentConfig;
  }

  // Issuance Dates
  getIssuanceDates() {
    return this.data.issuanceDates || [];
  }

  getIssuanceDate(year, certType) {
    const dates = this.getIssuanceDates();
    const normalizedType = certType.toUpperCase().trim();
    const found = dates.find(d => Number(d.year) === Number(year) && d.certType.toUpperCase() === normalizedType);
    return found ? found.dateStr : null;
  }

  setIssuanceDate(year, certType, dateStr) {
    if (!this.data.issuanceDates) this.data.issuanceDates = [];
    const normalizedType = certType.toUpperCase().trim();
    const index = this.data.issuanceDates.findIndex(
      d => Number(d.year) === Number(year) && d.certType.toUpperCase() === normalizedType
    );
    if (index >= 0) {
      this.data.issuanceDates[index].dateStr = dateStr;
    } else {
      this.data.issuanceDates.push({ year: Number(year), certType: normalizedType, dateStr });
    }
    this.save();
    return this.data.issuanceDates;
  }

  // Users
  getUserByUsername(username) {
    return (this.data.users || []).find(
      u => u.username.toLowerCase() === username.toLowerCase().trim()
    );
  }

  saveUser(user) {
    if (!this.data.users) this.data.users = [];
    const index = this.data.users.findIndex(
      u => u.username.toLowerCase() === user.username.toLowerCase().trim()
    );
    if (index >= 0) {
      this.data.users[index] = { ...this.data.users[index], ...user };
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }

  // Retenciones (Tax Withholdings)
  saveRetenciones(records) {
    if (!this.data.retenciones) this.data.retenciones = [];
    this.data.retenciones.push(...records);
    this.save();
    return records.length;
  }

  getRetencionesByNit(normalizedNit, year, certType) {
    if (!this.data.retenciones) return [];
    const targetType = certType.toUpperCase().trim();
    const targetYear = Number(year);
    const targetNit = String(normalizedNit).trim();

    return this.data.retenciones.filter(r => {
      const matchNit = String(r.normalizedNit).trim() === targetNit;
      const matchYear = Number(r.ano) === targetYear;
      const matchType = String(r.tipoCertificado).toUpperCase().trim() === targetType;
      return matchNit && matchYear && matchType;
    });
  }

  // Formulario 220 (Employees)
  saveFormulario220(records) {
    if (!this.data.formulario220) this.data.formulario220 = [];
    this.data.formulario220.push(...records);
    this.save();
    return records.length;
  }

  getFormulario220ByNit(normalizedNit, year) {
    if (!this.data.formulario220) return null;
    const targetYear = Number(year);
    const targetNit = String(normalizedNit).trim();

    return this.data.formulario220.find(f => {
      const matchNit = String(f.normalizedNit).trim() === targetNit;
      const matchYear = Number(f.ano) === targetYear;
      return matchNit && matchYear;
    });
  }

  // Available Years
  getAvailableYears(tipoTercero) {
    const yearsSet = new Set();
    const type = (tipoTercero || '').toLowerCase().trim();

    if (type === 'proveedor') {
      (this.data.retenciones || []).forEach(r => yearsSet.add(Number(r.ano)));
    } else if (type === 'empleado') {
      (this.data.formulario220 || []).forEach(f => yearsSet.add(Number(f.ano)));
    } else {
      (this.data.retenciones || []).forEach(r => yearsSet.add(Number(r.ano)));
      (this.data.formulario220 || []).forEach(f => yearsSet.add(Number(f.ano)));
    }

    if (yearsSet.size === 0) {
      (this.data.issuanceDates || []).forEach(d => yearsSet.add(Number(d.year)));
    }

    const sorted = Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [2025, 2024];
  }

  // Stats for Admin Dashboard
  getStats() {
    const retenciones = this.data.retenciones || [];
    const formulario220 = this.data.formulario220 || [];
    const maestroTerceros = this.data.maestroTerceros || [];

    const uniqueProviders = new Set(retenciones.map(r => r.normalizedNit)).size;
    const uniqueEmployees = new Set(formulario220.map(f => f.normalizedNit)).size;

    const retencionesByYear = {};
    retenciones.forEach(r => {
      const y = r.ano || 'Desconocido';
      retencionesByYear[y] = (retencionesByYear[y] || 0) + 1;
    });

    const f220ByYear = {};
    formulario220.forEach(f => {
      const y = f.ano || 'Desconocido';
      f220ByYear[y] = (f220ByYear[y] || 0) + 1;
    });

    const maestroWithEmail = maestroTerceros.filter(t => t.email && t.email.includes('@')).length;
    const maestroProveedores = maestroTerceros.filter(t => t.tipoTercero === 'proveedor' || t.tipoTercero === 'ambos').length;
    const maestroEmpleados = maestroTerceros.filter(t => t.tipoTercero === 'empleado' || t.tipoTercero === 'ambos').length;

    return {
      totalRetencionesRecords: retenciones.length,
      totalProviders: uniqueProviders,
      totalFormulario220Records: formulario220.length,
      totalEmployees: uniqueEmployees,
      totalMaestroTerceros: maestroTerceros.length,
      maestroWithEmail,
      maestroProveedores,
      maestroEmpleados,
      retencionesByYear,
      f220ByYear,
      availableYears: this.getAvailableYears()
    };
  }

  // Maestro de Terceros (Providers & Employees Master with Emails)
  getMaestroTerceros() {
    return this.data.maestroTerceros || [];
  }

  getTerceroByNit(normalizedNit, tipoTercero) {
    if (!this.data.maestroTerceros) this.data.maestroTerceros = [];
    const cleanNit = String(normalizedNit).replace(/\D/g, '').trim();
    if (!cleanNit) return null;

    // First try matching both NIT and tipoTercero
    if (tipoTercero) {
      const targetType = tipoTercero.toLowerCase().trim();
      const match = this.data.maestroTerceros.find(t => {
        const tNit = String(t.normalizedNit).trim();
        const tType = (t.tipoTercero || 'ambos').toLowerCase().trim();
        return tNit === cleanNit && (tType === targetType || tType === 'ambos');
      });
      if (match) return match;
    }

    // Fallback: match by NIT alone
    return this.data.maestroTerceros.find(t => String(t.normalizedNit).trim() === cleanNit) || null;
  }

  saveMaestroTercero(tercero) {
    if (!this.data.maestroTerceros) this.data.maestroTerceros = [];
    const cleanNit = String(tercero.normalizedNit || tercero.nit).replace(/\D/g, '').trim();
    const index = this.data.maestroTerceros.findIndex(t => String(t.normalizedNit).trim() === cleanNit);

    const record = {
      id: tercero.id || `tercero-${cleanNit}`,
      nit: String(tercero.nit || cleanNit).trim(),
      normalizedNit: cleanNit,
      razonSocial: String(tercero.razonSocial || tercero.nombre || '').trim().toUpperCase(),
      email: String(tercero.email || '').trim().toLowerCase(),
      tipoTercero: (tercero.tipoTercero || 'proveedor').toLowerCase().trim(),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      this.data.maestroTerceros[index] = {
        ...this.data.maestroTerceros[index],
        ...record
      };
    } else {
      record.createdAt = new Date().toISOString();
      this.data.maestroTerceros.push(record);
    }

    this.save();
    return record;
  }

  bulkSaveMaestroTerceros(records) {
    if (!this.data.maestroTerceros) this.data.maestroTerceros = [];
    let inserted = 0;
    let updated = 0;

    records.forEach(rec => {
      const cleanNit = String(rec.normalizedNit || rec.nit).replace(/\D/g, '').trim();
      if (!cleanNit) return;

      const index = this.data.maestroTerceros.findIndex(t => String(t.normalizedNit).trim() === cleanNit);
      const record = {
        id: rec.id || `tercero-${cleanNit}`,
        nit: String(rec.nit || cleanNit).trim(),
        normalizedNit: cleanNit,
        razonSocial: String(rec.razonSocial || rec.nombre || '').trim().toUpperCase(),
        email: String(rec.email || '').trim().toLowerCase(),
        tipoTercero: (rec.tipoTercero || 'proveedor').toLowerCase().trim(),
        updatedAt: new Date().toISOString()
      };

      if (index >= 0) {
        this.data.maestroTerceros[index] = {
          ...this.data.maestroTerceros[index],
          ...record
        };
        updated++;
      } else {
        record.createdAt = new Date().toISOString();
        this.data.maestroTerceros.push(record);
        inserted++;
      }
    });

    this.save();
    return { inserted, updated, total: this.data.maestroTerceros.length };
  }

  listMaestroTerceros({ search, tipo, page = 1, limit = 50 }) {
    let list = this.data.maestroTerceros || [];
    if (tipo && tipo !== 'todos') {
      const normTipo = tipo.toLowerCase().trim();
      list = list.filter(t => (t.tipoTercero || 'ambos').toLowerCase() === normTipo || t.tipoTercero === 'ambos');
    }
    if (search) {
      const s = String(search).toLowerCase().trim();
      list = list.filter(t => 
        String(t.normalizedNit).includes(s) || 
        String(t.nit).toLowerCase().includes(s) || 
        String(t.razonSocial).toLowerCase().includes(s) || 
        String(t.email).toLowerCase().includes(s)
      );
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      items: paginated
    };
  }

  deleteMaestroTercero(idOrNit) {
    if (!this.data.maestroTerceros) return false;
    const clean = String(idOrNit).replace(/\D/g, '').trim();
    const initialLen = this.data.maestroTerceros.length;

    this.data.maestroTerceros = this.data.maestroTerceros.filter(t => 
      t.id !== idOrNit && t.normalizedNit !== clean
    );

    const deleted = this.data.maestroTerceros.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  clearMaestroTerceros() {
    const count = (this.data.maestroTerceros || []).length;
    this.data.maestroTerceros = [];
    this.save();
    return count;
  }

  // Records Browsing & Deletion
  listRetenciones({ year, nit, limit = 50, page = 1 }) {
    let list = this.data.retenciones || [];
    if (year) {
      list = list.filter(r => Number(r.ano) === Number(year));
    }
    if (nit) {
      const clean = String(nit).replace(/\D/g, '');
      list = list.filter(r => String(r.normalizedNit).includes(clean));
    }
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      items: paginated
    };
  }

  deleteRetenciones({ year, certType }) {
    if (!this.data.retenciones) return 0;
    const initialCount = this.data.retenciones.length;
    this.data.retenciones = this.data.retenciones.filter(r => {
      const matchYear = year ? Number(r.ano) === Number(year) : true;
      const matchType = certType ? r.tipoCertificado.toUpperCase() === certType.toUpperCase() : true;
      return !(matchYear && matchType);
    });
    const deleted = initialCount - this.data.retenciones.length;
    this.save();
    return deleted;
  }

  listFormulario220({ year, nit, limit = 50, page = 1 }) {
    let list = this.data.formulario220 || [];
    if (year) {
      list = list.filter(f => Number(f.ano) === Number(year));
    }
    if (nit) {
      const clean = String(nit).replace(/\D/g, '');
      list = list.filter(f => String(f.normalizedNit).includes(clean));
    }
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      items: paginated
    };
  }

  deleteFormulario220({ year }) {
    if (!this.data.formulario220) return 0;
    const initialCount = this.data.formulario220.length;
    this.data.formulario220 = this.data.formulario220.filter(f => {
      const matchYear = year ? Number(f.ano) === Number(year) : true;
      return !matchYear;
    });
    const deleted = initialCount - this.data.formulario220.length;
    this.save();
    return deleted;
  }
}

/**
 * In-memory OTP Store with 10-minute validity and attempt tracking
 */
class OtpStore {
  constructor() {
    this.otps = new Map();
  }

  createKey(normNit, year, certType) {
    const cleanNit = String(normNit).replace(/\D/g, '').trim();
    const cType = String(certType || '').toUpperCase().trim();
    return `${cleanNit}_${year}_${cType}`;
  }

  set({ normNit, year, certType, otp, email, tipoTercero, expiresInMinutes = 10 }) {
    const key = this.createKey(normNit, year, certType);
    const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);
    this.otps.set(key, {
      normNit: String(normNit).replace(/\D/g, '').trim(),
      year: Number(year),
      certType: String(certType || '').toUpperCase().trim(),
      otp: String(otp).trim(),
      email: String(email).trim().toLowerCase(),
      tipoTercero,
      expiresAt,
      attempts: 0
    });
    return { expiresAt, expiresInMinutes };
  }

  get(normNit, year, certType) {
    const key = this.createKey(normNit, year, certType);
    return this.otps.get(key) || null;
  }

  verify({ normNit, year, certType, otp }) {
    const key = this.createKey(normNit, year, certType);
    const record = this.otps.get(key);

    if (!record) {
      return {
        valid: false,
        error: 'OTP_NOT_FOUND',
        message: 'No se encontró un código activo o ya fue utilizado. Por favor solicite un nuevo código.'
      };
    }

    if (Date.now() > record.expiresAt) {
      this.otps.delete(key);
      return {
        valid: false,
        error: 'OTP_EXPIRED',
        message: 'El código de verificación ha expirado (validez máxima de 10 minutos). Solicite uno nuevo.'
      };
    }

    if (record.attempts >= 5) {
      this.otps.delete(key);
      return {
        valid: false,
        error: 'MAX_ATTEMPTS',
        message: 'Superó el número máximo de intentos fallidos (5). Por seguridad, solicite un nuevo código.'
      };
    }

    if (String(otp).trim() !== record.otp) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return {
        valid: false,
        error: 'INVALID_OTP',
        message: `Código de verificación incorrecto. Le quedan ${remaining} intento(s).`
      };
    }

    // Success -> consume OTP
    this.otps.delete(key);
    return {
      valid: true,
      data: record
    };
  }

  remove(normNit, year, certType) {
    const key = this.createKey(normNit, year, certType);
    return this.otps.delete(key);
  }
}

const db = new JsonDB();
db.otpStore = new OtpStore();

module.exports = db;
