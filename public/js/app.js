/**
 * Application State and Controller
 */

const App = {
  currentUser: null,
  activeAdminTab: 'upload',
  inactivityTimer: null,
  INACTIVITY_LIMIT: 15 * 60 * 1000, // 15 minutes
  currentOtpContext: null,
  otpTimerInterval: null,

  init() {
    this.setupEventListeners();
    this.setupInactivityTracker();
    this.loadPublicData();
    this.checkSession();
  },

  // Setup Inactivity auto-logout
  setupInactivityTracker() {
    const resetTimer = () => {
      if (this.currentUser) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
          this.handleSessionTimeout();
        }, this.INACTIVITY_LIMIT);
      }
    };

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });
  },

  handleSessionTimeout() {
    if (this.currentUser) {
      API.logout();
      this.currentUser = null;
      this.showToast('Sesión cerrada automáticamente por inactividad.', 'warning');
      this.switchView('public');
    }
  },

  // Initialize public data
  async loadPublicData() {
    try {
      const config = await API.getPublicConfig();
      document.querySelectorAll('.cc-name').forEach(el => el.textContent = config.razonSocial || 'PRIMAVERA URBANA CENTRO COMERCIAL Y EMPRESARIAL');
      document.querySelectorAll('.cc-nit').forEach(el => el.textContent = `NIT: ${config.nit || '901003351'}-${config.dv || '2'}`);
      document.querySelectorAll('.cc-email').forEach(el => el.textContent = config.email || '');
      document.querySelectorAll('.cc-phone').forEach(el => el.textContent = config.telefono || '');
      
      const tipoTercero = document.querySelector('input[name="tipoTercero"]:checked')?.value || 'proveedor';
      await this.loadPublicYears(tipoTercero);
    } catch (e) {
      console.error('Error loading public info:', e);
    }
  },

  async loadPublicYears(tipoTercero = 'proveedor') {
    try {
      const yearsData = await API.getPublicYears(tipoTercero);
      const yearSelect = document.getElementById('consult-year');
      if (yearSelect && yearsData.years) {
        const previousVal = yearSelect.value;
        yearSelect.innerHTML = '';
        yearsData.years.forEach(y => {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = `Vigencia ${y}`;
          yearSelect.appendChild(opt);
        });
        if (previousVal && yearsData.years.includes(Number(previousVal))) {
          yearSelect.value = previousVal;
        }
      }
    } catch (e) {
      console.error('Error loading available years:', e);
    }
  },

  async checkSession() {
    const auth = await API.verifyAuth();
    const isAdminPath = window.location.hash === '#admin' || window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
    if (auth && auth.valid) {
      this.currentUser = auth.user;
      this.updateAuthUI(true);
      if (isAdminPath) {
        this.switchView('admin');
      }
    } else {
      this.updateAuthUI(false);
      if (isAdminPath) {
        this.openLoginModal();
      }
    }
  },

  updateAuthUI(isLoggedIn) {
    const btnLogin = document.getElementById('btn-open-login');
    const btnAdminPortal = document.getElementById('btn-admin-portal');
    const userBadge = document.getElementById('admin-user-badge');

    if (isLoggedIn) {
      if (btnLogin) btnLogin.classList.add('hidden');
      if (btnAdminPortal) btnAdminPortal.classList.remove('hidden');
      if (userBadge) userBadge.textContent = this.currentUser?.username || 'admin';
    } else {
      if (btnLogin) btnLogin.classList.remove('hidden');
      if (btnAdminPortal) btnAdminPortal.classList.add('hidden');
    }
  },

  setupEventListeners() {
    // Hash and pathname change routing
    const checkRoute = () => {
      const isAdminPath = window.location.hash === '#admin' || window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
      if (isAdminPath) {
        if (this.currentUser) {
          this.switchView('admin');
        } else {
          this.openLoginModal();
        }
      } else {
        this.switchView('public');
      }
    };

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);

    // Public Consultation Form Handlers
    const thirdPartyRadios = document.querySelectorAll('input[name="tipoTercero"]');
    thirdPartyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleThirdPartyChange(e.target.value);
      });
    });

    // Clean NIT input on paste and input
    const nitInput = document.getElementById('consult-nit');
    if (nitInput) {
      nitInput.addEventListener('input', (e) => {
        // Strip out non-alphanumeric except hyphen
        e.target.value = e.target.value.replace(/[^0-9-]/g, '');
      });
    }

    // Public Consultation Submit
    const consultForm = document.getElementById('consult-form');
    if (consultForm) {
      consultForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleConsultSubmit();
      });
    }

    // Login Form Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLoginSubmit();
      });
    }

    // Drag and Drop for Excel upload
    const dropzone = document.getElementById('excel-dropzone');
    const fileInput = document.getElementById('excel-file-input');
    if (dropzone && fileInput) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.add('dropzone-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('dropzone-active');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length) {
          fileInput.files = e.dataTransfer.files;
          this.updateFileNameDisplay(fileInput.files[0].name);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
          this.updateFileNameDisplay(fileInput.files[0].name);
        }
      });
    }

    // Drag and Drop for Maestro de Terceros upload
    const maestroDropzone = document.getElementById('maestro-dropzone');
    const maestroFileInput = document.getElementById('maestro-file-input');
    if (maestroDropzone && maestroFileInput) {
      ['dragenter', 'dragover'].forEach(eventName => {
        maestroDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          maestroDropzone.classList.add('dropzone-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        maestroDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          maestroDropzone.classList.remove('dropzone-active');
        });
      });

      maestroDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length) {
          maestroFileInput.files = e.dataTransfer.files;
          const label = document.getElementById('maestro-selected-file-name');
          if (label) {
            label.textContent = `Archivo seleccionado: ${maestroFileInput.files[0].name}`;
            label.classList.remove('hidden');
          }
        }
      });

      maestroFileInput.addEventListener('change', () => {
        if (maestroFileInput.files.length) {
          const label = document.getElementById('maestro-selected-file-name');
          if (label) {
            label.textContent = `Archivo seleccionado: ${maestroFileInput.files[0].name}`;
            label.classList.remove('hidden');
          }
        }
      });
    }
  },

  updateFileNameDisplay(name) {
    const el = document.getElementById('selected-file-name');
    if (el) {
      el.textContent = `Archivo seleccionado: ${name}`;
      el.classList.remove('hidden');
    }
  },

  handleThirdPartyChange(type) {
    const certTypeContainer = document.getElementById('cert-type-container');
    const certTypeSelect = document.getElementById('consult-cert-type');
    const labelId = document.getElementById('label-identificacion');
    const helpText = document.getElementById('help-identificacion');

    if (type === 'proveedor') {
      labelId.textContent = 'Número de Identificación o NIT:';
      helpText.textContent = 'Ingrese el NIT sin dígito de verificación ni puntos (ej. 900456789)';
      certTypeContainer.classList.remove('hidden');
      certTypeSelect.innerHTML = `
        <option value="RENTA">Retención en la Fuente (RENTA)</option>
        <option value="IVA">Retención de IVA</option>
        <option value="ICA">Retención de ICA</option>
      `;
    } else {
      labelId.textContent = 'Número de Documento del Empleado:';
      helpText.textContent = 'Ingrese la cédula de ciudadanía sin puntos ni comas (ej. 1018456789)';
      certTypeContainer.classList.remove('hidden');
      certTypeSelect.innerHTML = `
        <option value="F220" selected>Formato 220 - Certificado de Ingresos y Retenciones</option>
      `;
    }
    this.loadPublicYears(type);
  },

  async handleConsultSubmit() {
    const tipoTercero = document.querySelector('input[name="tipoTercero"]:checked')?.value || 'proveedor';
    const nit = document.getElementById('consult-nit').value.trim();
    const tipoCertificado = document.getElementById('consult-cert-type').value;
    const year = document.getElementById('consult-year').value;

    const feedbackEl = document.getElementById('consult-feedback');
    const btnSubmit = document.getElementById('btn-submit-consult');
    const btnText = document.getElementById('btn-consult-text');
    const btnSpinner = document.getElementById('btn-consult-spinner');

    if (!nit) {
      this.showToast('Por favor ingrese el número de identificación o NIT.', 'warning');
      return;
    }

    // Set loading state
    btnSubmit.disabled = true;
    btnText.textContent = 'Verificando y enviando código OTP...';
    btnSpinner.classList.remove('hidden');
    feedbackEl.classList.add('hidden');

    try {
      const res = await API.requestOtp({
        tipoTercero,
        nit,
        tipoCertificado,
        year
      });

      if (res.success) {
        this.currentOtpContext = {
          tipoTercero,
          nit,
          tipoCertificado,
          year,
          maskedEmail: res.maskedEmail,
          devOtp: res.devOtp,
          terceroNombre: res.terceroNombre
        };

        this.openOtpModal(res);
        this.showToast(res.message || 'Código OTP enviado exitosamente.', 'success');
      }
    } catch (err) {
      console.error('Error in handleConsultSubmit:', err);
      const errorMsg = err.message || 'Error al procesar la solicitud.';
      
      // Render friendly contact card if third party is not in master or has no email
      feedbackEl.className = 'mt-6 p-5 rounded-2xl border border-[#C5922C]/40 bg-[#fdf8ee] text-slate-800 shadow-sm';
      feedbackEl.innerHTML = `
        <div class="flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-xl bg-[#fcf3dc] text-[#946914] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div class="flex-grow">
            <h4 class="font-bold text-[#234923] text-sm">Información de Seguridad Requerida</h4>
            <p class="text-xs text-slate-700 mt-1">${errorMsg}</p>
            <div class="mt-3 text-xs bg-white/80 border border-[#C5922C]/20 p-3 rounded-xl flex flex-wrap gap-4 text-slate-600">
              <span><strong>Canal Contable:</strong> <span class="cc-email text-[#234923] font-medium">contabilidad@primaveraurbana.com.co</span></span>
              <span><strong>Teléfono:</strong> <span class="cc-phone text-[#234923] font-medium">310 689 0750</span></span>
              <span><strong>Ciudad:</strong> <span class="text-[#234923] font-medium">Villavicencio (Meta)</span></span>
            </div>
          </div>
        </div>
      `;
      feedbackEl.classList.remove('hidden');
      this.showToast(errorMsg, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnText.textContent = 'Solicitar Código de Verificación';
      btnSpinner.classList.add('hidden');
    }
  },

  // OTP Modal Logic
  openOtpModal(data) {
    const modal = document.getElementById('modal-otp');
    const maskedEmailEl = document.getElementById('otp-masked-email');
    const inputEl = document.getElementById('otp-code-input');

    if (maskedEmailEl) {
      maskedEmailEl.textContent = data.maskedEmail || 'su correo institucional';
    }

    if (inputEl) {
      inputEl.value = '';
    }

    // Start 10 minute countdown timer
    this.startOtpCountdown(data.expiresInSeconds || 600);

    modal.classList.remove('hidden');
    setTimeout(() => {
      if (inputEl) inputEl.focus();
    }, 150);
  },

  closeOtpModal() {
    const modal = document.getElementById('modal-otp');
    if (modal) modal.classList.add('hidden');
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
      this.otpTimerInterval = null;
    }
  },

  startOtpCountdown(seconds = 600) {
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    const countdownEl = document.getElementById('otp-countdown');
    let remaining = seconds;

    const updateDisplay = () => {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      if (countdownEl) {
        countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (remaining <= 0) {
        clearInterval(this.otpTimerInterval);
        if (countdownEl) countdownEl.textContent = 'Expirado';
        this.showToast('El código OTP ha expirado. Por favor solicite uno nuevo.', 'warning');
      }
      remaining--;
    };

    updateDisplay();
    this.otpTimerInterval = setInterval(updateDisplay, 1000);
  },

  async handleVerifyOtpSubmit(e) {
    if (e) e.preventDefault();
    if (!this.currentOtpContext) {
      this.showToast('Sesión de verificación inválida.', 'error');
      return;
    }

    const otpInput = document.getElementById('otp-code-input');
    const otp = otpInput ? otpInput.value.trim() : '';

    if (!otp || otp.length < 6) {
      this.showToast('Por favor ingrese el código completo de 6 dígitos.', 'warning');
      return;
    }

    const btnVerify = document.getElementById('btn-verify-otp');
    const btnSpinner = document.getElementById('btn-otp-spinner');
    const btnText = document.getElementById('btn-otp-text');

    btnVerify.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Validando código de seguridad...';

    try {
      const verifyRes = await API.verifyOtp({
        tipoTercero: this.currentOtpContext.tipoTercero,
        nit: this.currentOtpContext.nit,
        tipoCertificado: this.currentOtpContext.tipoCertificado,
        year: this.currentOtpContext.year,
        otp
      });

      if (verifyRes.success) {
        this.closeOtpModal();
        this.showToast('¡Código validado exitosamente! Descargando PDF oficial...', 'success');

        const feedbackEl = document.getElementById('consult-feedback');
        feedbackEl.className = 'mt-6 p-5 rounded-2xl border border-[#234923]/30 bg-[#ebf3eb] text-slate-800 shadow-sm';
        feedbackEl.innerHTML = `
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-[#234923] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="flex-grow">
              <h4 class="font-bold text-[#234923] text-sm">¡Autenticación Exitosa y Certificado Generado!</h4>
              <p class="text-xs text-slate-700 mt-1">Beneficiario: <strong class="text-slate-900">${this.currentOtpContext.terceroNombre || this.currentOtpContext.nit}</strong> (NIT/CC: ${this.currentOtpContext.nit}) • Vigencia ${this.currentOtpContext.year}</p>
              <p class="text-[11px] text-[#234923] font-medium mt-1">El documento oficial se ha descargado automáticamente en su navegador.</p>
              <div class="mt-3.5 flex flex-wrap gap-2.5">
                <a href="${verifyRes.downloadUrl}" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 btn-forest text-white rounded-lg text-xs font-semibold shadow-xs transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Descargar de nuevo
                </a>
                <a href="${verifyRes.downloadUrl}&inline=true" target="_blank" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#C5922C] text-[#234923] hover:bg-[#fcf9f2] rounded-lg text-xs font-semibold shadow-2xs transition">
                  <svg class="w-4 h-4 text-[#C5922C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Ver PDF en navegador
                </a>
              </div>
            </div>
          </div>
        `;
        feedbackEl.classList.remove('hidden');

        // Automatically trigger download
        const tempLink = document.createElement('a');
        tempLink.href = verifyRes.downloadUrl;
        tempLink.setAttribute('download', '');
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      const msg = err.message || 'Código de verificación incorrecto o expirado.';
      this.showToast(msg, 'error');
    } finally {
      btnVerify.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Validar Código y Descargar PDF';
    }
  },

  async handleResendOtp() {
    if (!this.currentOtpContext) return;
    this.showToast('Reenviando código de verificación...', 'info');

    try {
      const res = await API.requestOtp({
        tipoTercero: this.currentOtpContext.tipoTercero,
        nit: this.currentOtpContext.nit,
        tipoCertificado: this.currentOtpContext.tipoCertificado,
        year: this.currentOtpContext.year
      });

      if (res.success) {
        this.openOtpModal(res);
        this.showToast('Nuevo código de verificación enviado a su correo registrado.', 'success');
      }
    } catch (err) {
      this.showToast(err.message || 'Error al reenviar código.', 'error');
    }
  },

  // Fill quick demo values
  fillDemoData(type, nit, certType, year) {
    const radio = document.querySelector(`input[name="tipoTercero"][value="${type}"]`);
    if (radio) {
      radio.checked = true;
      this.handleThirdPartyChange(type);
    }
    document.getElementById('consult-nit').value = nit;
    if (certType) {
      document.getElementById('consult-cert-type').value = certType;
    }
    if (year) {
      document.getElementById('consult-year').value = year;
    }
    this.showToast(`Datos de prueba cargados: ${type.toUpperCase()} ${nit}`, 'info');
  },

  // Navigation and Views
  switchView(view) {
    const publicView = document.getElementById('view-public');
    const adminView = document.getElementById('view-admin');

    if (view === 'admin') {
      if (!this.currentUser) {
        this.openLoginModal();
        return;
      }
      publicView.classList.add('hidden');
      adminView.classList.remove('hidden');
      window.location.hash = '#admin';
      this.loadAdminDashboard();
    } else {
      publicView.classList.remove('hidden');
      adminView.classList.add('hidden');
      window.location.hash = '';
      this.loadPublicData();
    }
  },

  // Login Modal
  openLoginModal() {
    const modal = document.getElementById('modal-login');
    modal.classList.remove('hidden');
  },

  closeLoginModal() {
    const modal = document.getElementById('modal-login');
    modal.classList.add('hidden');
  },

  async handleLoginSubmit() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    try {
      const data = await API.login(user, pass);
      this.currentUser = data.user;
      this.updateAuthUI(true);
      this.closeLoginModal();
      this.showToast(`Bienvenido al panel contable, ${data.user.username}.`, 'success');
      this.switchView('admin');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  handleLogout() {
    API.logout();
    this.currentUser = null;
    this.updateAuthUI(false);
    this.showToast('Sesión finalizada exitosamente.', 'info');
    this.switchView('public');
  },

  // Admin Navigation Tabs
  setAdminTab(tab) {
    this.activeAdminTab = tab;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('border-[#234923]', 'text-[#234923]', 'bg-[#ebf3eb]');
        btn.classList.remove('border-transparent', 'text-slate-600');
      } else {
        btn.classList.remove('border-[#234923]', 'text-[#234923]', 'bg-[#ebf3eb]');
        btn.classList.add('border-transparent', 'text-slate-600');
      }
    });

    document.querySelectorAll('.admin-tab-content').forEach(section => {
      section.classList.add('hidden');
    });

    const targetSection = document.getElementById(`tab-content-${tab}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    if (tab === 'dashboard') this.loadAdminDashboard();
    if (tab === 'maestro') this.loadMaestroTerceros();
    if (tab === 'config') this.loadAdminConfig();
    if (tab === 'dates') this.loadAdminIssuanceDates();
    if (tab === 'records') this.loadAdminRecords();
  },

  // Tab: Dashboard
  async loadAdminDashboard() {
    try {
      const stats = await API.getStats();
      document.getElementById('stat-retenciones').textContent = stats.totalRetencionesRecords.toLocaleString('es-CO');
      document.getElementById('stat-proveedores').textContent = stats.totalProviders.toLocaleString('es-CO');
      document.getElementById('stat-f220').textContent = stats.totalFormulario220Records.toLocaleString('es-CO');
      document.getElementById('stat-empleados').textContent = stats.totalEmployees.toLocaleString('es-CO');

      // Maestro stats if present
      const statMaestroTotal = document.getElementById('stat-maestro-total');
      if (statMaestroTotal && stats.totalMaestroTerceros !== undefined) {
        statMaestroTotal.textContent = stats.totalMaestroTerceros.toLocaleString('es-CO');
        const elEmail = document.getElementById('stat-maestro-email');
        if (elEmail) elEmail.textContent = stats.maestroWithEmail.toLocaleString('es-CO');
        const elProv = document.getElementById('stat-maestro-prov');
        if (elProv) elProv.textContent = stats.maestroProveedores.toLocaleString('es-CO');
        const elEmp = document.getElementById('stat-maestro-emp');
        if (elEmp) elEmp.textContent = stats.maestroEmpleados.toLocaleString('es-CO');
      }

      // Populate year breakdown
      const listEl = document.getElementById('dashboard-years-list');
      if (listEl) {
        listEl.innerHTML = '';
        stats.availableYears.forEach(y => {
          const retCount = stats.retencionesByYear[y] || 0;
          const f220Count = stats.f220ByYear[y] || 0;
          const div = document.createElement('div');
          div.className = 'flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm';
          div.innerHTML = `
            <span class="font-bold text-slate-800">Vigencia Fiscal ${y}</span>
            <div class="flex gap-4 text-xs">
              <span class="text-sky-700 bg-sky-100 px-2 py-1 rounded"><strong>${retCount}</strong> retenciones</span>
              <span class="text-emerald-700 bg-emerald-100 px-2 py-1 rounded"><strong>${f220Count}</strong> Form. 220</span>
            </div>
          `;
          listEl.appendChild(div);
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Tab: Upload Excel
  async handleExcelUploadSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('excel-file-input');
    const category = document.getElementById('upload-category').value;
    const year = document.getElementById('upload-year').value;
    const btnUpload = document.getElementById('btn-upload-excel');
    const uploadResult = document.getElementById('upload-result');

    if (!fileInput.files.length) {
      this.showToast('Por favor seleccione un archivo Excel.', 'warning');
      return;
    }

    btnUpload.disabled = true;
    btnUpload.innerHTML = `<span class="spinner inline-block mr-2"></span> Procesando y validando Excel...`;
    uploadResult.classList.add('hidden');

    try {
      const result = await API.uploadExcel(fileInput.files[0], category, year);
      uploadResult.className = 'mt-4 p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900';
      uploadResult.innerHTML = `
        <div class="flex items-start gap-3">
          <svg class="w-6 h-6 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h4 class="font-bold">¡Carga masiva exitosa!</h4>
            <p class="text-sm mt-1">${result.message}</p>
            <p class="text-xs text-emerald-700 mt-1">Filas procesadas: ${result.totalParsed} | Filas omitidas: ${result.skippedRows}</p>
          </div>
        </div>
      `;
      uploadResult.classList.remove('hidden');
      this.showToast('Archivo importado satisfactoriamente.', 'success');
      fileInput.value = '';
      document.getElementById('selected-file-name').classList.add('hidden');
      this.loadPublicData();
    } catch (err) {
      uploadResult.className = 'mt-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-900';
      uploadResult.innerHTML = `
        <div class="flex items-start gap-3">
          <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h4 class="font-bold">Error en la validación del Excel</h4>
            <p class="text-sm mt-1">${err.message}</p>
          </div>
        </div>
      `;
      uploadResult.classList.remove('hidden');
    } finally {
      btnUpload.disabled = false;
      btnUpload.textContent = 'Subir y Procesar Archivo';
    }
  },

  // Programmatic Template Downloader
  async downloadTemplate(e, type) {
    if (e) e.preventDefault();
    this.showToast('Descargando plantilla oficial de Excel...', 'info');
    try {
      const url = `/api/admin/download-template/${type}`;
      const token = API.getToken();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error('Error al obtener el archivo desde el servidor');
      }
      const blob = await res.blob();
      let filename = 'Plantilla_Retenciones_Proveedores.xlsx';
      if (type === 'formulario220') filename = 'Plantilla_Formulario_220_Empleados.xlsx';
      if (type === 'maestro-terceros' || type === 'maestro') filename = 'Plantilla_Maestro_Terceros.xlsx';
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      this.showToast('Plantilla descargada exitosamente.', 'success');
    } catch (err) {
      console.warn('Fallback a descarga directa:', err);
      window.location.href = `/api/admin/download-template/${type}`;
    }
  },

  // Tab: Config Agente Retenedor
  async loadAdminConfig() {
    try {
      const config = await API.getAdminConfig();
      document.getElementById('cfg-razonSocial').value = config.razonSocial || '';
      document.getElementById('cfg-nit').value = config.nit || '';
      document.getElementById('cfg-dv').value = config.dv || '';
      document.getElementById('cfg-direccion').value = config.direccion || '';
      document.getElementById('cfg-ciudad').value = config.ciudad || '';
      document.getElementById('cfg-departamento').value = config.departamento || '';
      document.getElementById('cfg-telefono').value = config.telefono || '';
      document.getElementById('cfg-email').value = config.email || '';
      document.getElementById('cfg-representanteLegal').value = config.representanteLegal || '';
      document.getElementById('cfg-cargoRepresentante').value = config.cargoRepresentante || '';
      document.getElementById('cfg-contador').value = config.contador || '';
      document.getElementById('cfg-tarjetaProfesional').value = config.tarjetaProfesional || '';

      const gwEmailEl = document.getElementById('cfg-gworkspaceEmail');
      if (gwEmailEl) gwEmailEl.value = config.gworkspaceEmail || 'contabilidad@primaveraurbana.com.co';
      const gwPassEl = document.getElementById('cfg-gworkspaceAppPassword');
      if (gwPassEl) gwPassEl.value = config.gworkspaceAppPassword || '';
      const gwHostEl = document.getElementById('cfg-gworkspaceSmtpHost');
      if (gwHostEl) gwHostEl.value = config.gworkspaceSmtpHost || 'smtp.gmail.com';
      const gwPortEl = document.getElementById('cfg-gworkspaceSmtpPort');
      if (gwPortEl) gwPortEl.value = config.gworkspaceSmtpPort || 465;

      const sigPreview = document.getElementById('signature-preview');
      if (config.firmaDigitalBase64) {
        sigPreview.src = config.firmaDigitalBase64;
        sigPreview.classList.remove('hidden');
      } else {
        sigPreview.classList.add('hidden');
      }

      const logoPreview = document.getElementById('logo-preview');
      if (logoPreview) {
        if (config.logoBase64) {
          logoPreview.src = config.logoBase64;
          logoPreview.classList.remove('hidden');
        } else {
          logoPreview.classList.add('hidden');
        }
      }
    } catch (err) {
      this.showToast('Error al cargar la configuración.', 'error');
    }
  },

  async handleConfigSubmit(e) {
    e.preventDefault();
    const data = {
      razonSocial: document.getElementById('cfg-razonSocial').value.trim(),
      nit: document.getElementById('cfg-nit').value.trim(),
      dv: document.getElementById('cfg-dv').value.trim(),
      direccion: document.getElementById('cfg-direccion').value.trim(),
      ciudad: document.getElementById('cfg-ciudad').value.trim(),
      departamento: document.getElementById('cfg-departamento').value.trim(),
      telefono: document.getElementById('cfg-telefono').value.trim(),
      email: document.getElementById('cfg-email').value.trim(),
      representanteLegal: document.getElementById('cfg-representanteLegal').value.trim(),
      cargoRepresentante: document.getElementById('cfg-cargoRepresentante').value.trim(),
      contador: document.getElementById('cfg-contador').value.trim(),
      tarjetaProfesional: document.getElementById('cfg-tarjetaProfesional').value.trim(),
      gworkspaceEmail: document.getElementById('cfg-gworkspaceEmail')?.value.trim() || 'contabilidad@primaveraurbana.com.co',
      gworkspaceAppPassword: document.getElementById('cfg-gworkspaceAppPassword')?.value.trim() || '',
      gworkspaceSmtpHost: document.getElementById('cfg-gworkspaceSmtpHost')?.value.trim() || 'smtp.gmail.com',
      gworkspaceSmtpPort: parseInt(document.getElementById('cfg-gworkspaceSmtpPort')?.value || '465', 10)
    };

    try {
      await API.updateAdminConfig(data);
      this.showToast('Configuración del agente retenedor actualizada.', 'success');
      this.loadPublicData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleTestEmail() {
    const testRecipient = document.getElementById('test-recipient-email')?.value.trim();
    const gworkspaceAppPassword = document.getElementById('cfg-gworkspaceAppPassword')?.value.trim();
    const gworkspaceEmail = document.getElementById('cfg-gworkspaceEmail')?.value.trim() || 'contabilidad@primaveraurbana.com.co';
    const gworkspaceSmtpHost = document.getElementById('cfg-gworkspaceSmtpHost')?.value.trim() || 'smtp.gmail.com';
    const gworkspaceSmtpPort = parseInt(document.getElementById('cfg-gworkspaceSmtpPort')?.value || '465', 10);

    const btn = document.getElementById('btn-test-email');
    const spinner = document.getElementById('spinner-test-email');
    const resultBox = document.getElementById('test-email-result');

    if (!testRecipient || !testRecipient.includes('@')) {
      this.showToast('Por favor ingrese un correo válido para recibir la prueba.', 'warning');
      document.getElementById('test-recipient-email')?.focus();
      return;
    }

    if (!gworkspaceAppPassword) {
      this.showToast('Debe ingresar la Contraseña de Aplicación de 16 caracteres de Google Workspace antes de probar el envío.', 'warning');
      document.getElementById('cfg-gworkspaceAppPassword')?.focus();
      return;
    }

    btn.disabled = true;
    spinner.classList.remove('hidden');
    resultBox.className = 'mt-2 p-2.5 rounded-lg text-xs leading-relaxed font-medium bg-amber-50 text-amber-800 border border-amber-200';
    resultBox.textContent = 'Conectando con Google Workspace (smtp.gmail.com:465) y enviando correo de prueba...';
    resultBox.classList.remove('hidden');

    try {
      const res = await API.testEmailConnection({
        testRecipient,
        gworkspaceAppPassword,
        gworkspaceEmail,
        gworkspaceSmtpHost,
        gworkspaceSmtpPort
      });

      resultBox.className = 'mt-2 p-2.5 rounded-lg text-xs leading-relaxed font-medium bg-[#ebf3eb] text-[#234923] border border-[#234923]/30';
      resultBox.innerHTML = `<strong>✓ Conexión Exitosa:</strong> Correo de prueba enviado a <strong>${testRecipient}</strong> desde <strong>${gworkspaceEmail}</strong>.<br><span class="text-[11px] text-[#3B5270]">Revise la bandeja de entrada (y la carpeta de spam si es la primera vez).</span>`;
      this.showToast('Correo de prueba enviado con éxito.', 'success');
    } catch (err) {
      resultBox.className = 'mt-2 p-2.5 rounded-lg text-xs leading-relaxed font-medium bg-red-50 text-red-700 border border-red-200';
      resultBox.innerHTML = `<strong>❌ Error de Conexión:</strong> ${err.message}<br><span class="text-[11px] text-red-600">Asegúrese de haber activado la verificación en 2 pasos en la cuenta Google y de haber creado una Contraseña de Aplicación de 16 caracteres en myaccount.google.com/apppasswords.</span>`;
      this.showToast('Error al enviar correo de prueba.', 'error');
    } finally {
      btn.disabled = false;
      spinner.classList.add('hidden');
    }
  },

  async handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const res = await API.uploadSignature(file);
      const sigPreview = document.getElementById('signature-preview');
      sigPreview.src = res.firmaDigitalBase64;
      sigPreview.classList.remove('hidden');
      this.showToast('Firma digital actualizada exitosamente.', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const res = await API.uploadLogo(file);
      const logoPreview = document.getElementById('logo-preview');
      if (logoPreview) {
        logoPreview.src = res.logoBase64;
        logoPreview.classList.remove('hidden');
      }
      this.showToast('Logotipo corporativo actualizado exitosamente.', 'success');
      this.loadPublicData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Tab: Fechas de Expedición
  async loadAdminIssuanceDates() {
    try {
      const res = await API.getIssuanceDates();
      const tbody = document.getElementById('dates-table-body');
      tbody.innerHTML = '';
      (res.dates || []).forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50';
        tr.innerHTML = `
          <td class="p-3 font-semibold text-slate-900">${item.year}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-xs font-bold ${
              item.certType === 'F220' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
            }">${item.certType}</span>
          </td>
          <td class="p-3 text-slate-700">${item.dateStr}</td>
          <td class="p-3 text-right">
            <button onclick="App.editIssuanceDate(${item.year}, '${item.certType}', '${item.dateStr.replace(/'/g, "\\'")}')" class="text-xs text-sky-600 hover:text-sky-800 font-semibold">Editar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  },

  editIssuanceDate(year, certType, dateStr) {
    document.getElementById('date-year').value = year;
    document.getElementById('date-type').value = certType;
    document.getElementById('date-str').value = dateStr;
    document.getElementById('date-str').focus();
  },

  async handleSaveIssuanceDate(e) {
    e.preventDefault();
    const data = {
      year: document.getElementById('date-year').value,
      certType: document.getElementById('date-type').value,
      dateStr: document.getElementById('date-str').value.trim()
    };

    if (!data.dateStr) {
      this.showToast('Ingrese el texto de la fecha de expedición.', 'warning');
      return;
    }

    try {
      await API.saveIssuanceDate(data);
      this.showToast('Fecha de expedición guardada.', 'success');
      this.loadAdminIssuanceDates();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Tab: Records Explorer
  async loadAdminRecords() {
    const category = document.getElementById('records-category').value;
    const year = document.getElementById('records-year').value;
    const nit = document.getElementById('records-nit-search').value.trim();

    try {
      const data = await API.getRecords(category, { year, nit, limit: 30 });
      const tableHead = document.getElementById('records-table-head');
      const tableBody = document.getElementById('records-table-body');
      tableBody.innerHTML = '';

      if (category === 'retenciones') {
        tableHead.innerHTML = `
          <tr>
            <th class="p-3 text-left">NIT</th>
            <th class="p-3 text-left">Nombre / Proveedor</th>
            <th class="p-3 text-center">Tipo</th>
            <th class="p-3 text-left">Concepto</th>
            <th class="p-3 text-center">Año</th>
            <th class="p-3 text-right">Base ($)</th>
            <th class="p-3 text-right">Retención ($)</th>
          </tr>
        `;
        (data.items || []).forEach(r => {
          const tr = document.createElement('tr');
          tr.className = 'border-b border-slate-100 hover:bg-slate-50 text-xs';
          tr.innerHTML = `
            <td class="p-3 font-mono font-medium text-slate-800">${r.nit}</td>
            <td class="p-3 text-slate-900 font-medium">${r.nombre}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">${r.tipoCertificado}</span></td>
            <td class="p-3 text-slate-600">${r.descripcion}</td>
            <td class="p-3 text-center">${r.ano}</td>
            <td class="p-3 text-right font-mono">$ ${Math.round(r.base).toLocaleString('es-CO')}</td>
            <td class="p-3 text-right font-mono font-bold text-sky-800">$ ${Math.round(r.valor).toLocaleString('es-CO')}</td>
          `;
          tableBody.appendChild(tr);
        });
      } else {
        tableHead.innerHTML = `
          <tr>
            <th class="p-3 text-left">Cédula</th>
            <th class="p-3 text-left">Nombre Empleado</th>
            <th class="p-3 text-center">Año</th>
            <th class="p-3 text-right">Ingresos Brutos ($)</th>
            <th class="p-3 text-right">Retenciones ($)</th>
            <th class="p-3 text-right">Acción</th>
          </tr>
        `;
        (data.items || []).forEach(f => {
          const tr = document.createElement('tr');
          tr.className = 'border-b border-slate-100 hover:bg-slate-50 text-xs';
          tr.innerHTML = `
            <td class="p-3 font-mono font-medium text-slate-800">${f.nit}</td>
            <td class="p-3 text-slate-900 font-semibold">${f.nombreCompleto}</td>
            <td class="p-3 text-center font-bold">${f.ano}</td>
            <td class="p-3 text-right font-mono font-bold text-slate-800">$ ${(f.fields['Total, Ingresos brutos de rentas de trabajo y pensión'] || 0).toLocaleString('es-CO')}</td>
            <td class="p-3 text-right font-mono font-bold text-emerald-700">$ ${(f.fields['Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones'] || 0).toLocaleString('es-CO')}</td>
            <td class="p-3 text-right">
              <a href="${API.getDownloadUrl({ tipoTercero: 'empleado', nit: f.nit, year: f.ano }, true)}" target="_blank" class="text-sky-600 hover:text-sky-800 font-semibold">Ver PDF</a>
            </td>
          `;
          tableBody.appendChild(tr);
        });
      }

      document.getElementById('records-total-count').textContent = `Total registros encontrados: ${data.total}`;
    } catch (err) {
      console.error(err);
    }
  },

  async handleDeleteRecordsYear() {
    const category = document.getElementById('records-category').value;
    const year = prompt(`ADVERTENCIA: ¿Está seguro de eliminar TODOS los registros de ${category.toUpperCase()} para un año específico?\n\nIngrese el año fiscal a eliminar (ej. 2024):`);
    if (!year) return;

    try {
      const res = await API.deleteRecords(category, { year });
      this.showToast(res.message, 'success');
      this.loadAdminRecords();
      this.loadAdminDashboard();
    } catch (err) {
      this.showToast('Error al eliminar registros.', 'error');
    }
  },

  // Tab: Maestro de Terceros (Directory with Emails for OTP)
  async loadMaestroTerceros() {
    const search = document.getElementById('maestro-search')?.value.trim() || '';
    const tipo = document.getElementById('maestro-tipo-filter')?.value || 'todos';

    try {
      const data = await API.getMaestroTerceros({ search, tipo, limit: 100 });
      const tbody = document.getElementById('maestro-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="p-6 text-center text-slate-500 italic">
              No se encontraron registros en el maestro de terceros.
            </td>
          </tr>
        `;
      } else {
        data.items.forEach(t => {
          const hasEmail = t.email && t.email.includes('@');
          const tr = document.createElement('tr');
          tr.className = 'border-b border-slate-100 hover:bg-slate-50 text-xs';
          tr.innerHTML = `
            <td class="p-3 font-mono font-bold text-slate-900">${t.nit}</td>
            <td class="p-3 font-semibold text-slate-800">${t.razonSocial || 'TERCERO REGISTRADO'}</td>
            <td class="p-3">
              ${hasEmail 
                ? `<span class="inline-flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                     <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                     ${t.email}
                   </span>`
                : `<span class="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-medium">
                     ⚠️ Sin correo OTP
                   </span>`
              }
            </td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[11px] font-bold ${
                t.tipoTercero === 'empleado' 
                  ? 'bg-amber-100 text-amber-900' 
                  : (t.tipoTercero === 'ambos' ? 'bg-purple-100 text-purple-900' : 'bg-emerald-100 text-[#234923]')
              }">
                ${t.tipoTercero.toUpperCase()}
              </span>
            </td>
            <td class="p-3 text-right">
              <button onclick="App.handleDeleteMaestroTercero('${t.id || t.normalizedNit}')" class="text-rose-600 hover:text-rose-800 font-semibold text-xs">
                Eliminar
              </button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }

      const counter = document.getElementById('maestro-total-counter');
      if (counter) counter.textContent = `Terceros registrados: ${data.total}`;

      // Refresh dashboard counters too
      this.loadAdminDashboard();
    } catch (err) {
      console.error('Error loading maestro terceros:', err);
    }
  },

  async handleMaestroUploadSubmit(e) {
    if (e) e.preventDefault();
    const fileInput = document.getElementById('maestro-file-input');
    const btnUpload = document.getElementById('btn-upload-maestro');

    if (!fileInput.files.length) {
      this.showToast('Por favor seleccione un archivo Excel o CSV con el Maestro de Terceros.', 'warning');
      return;
    }

    btnUpload.disabled = true;
    btnUpload.innerHTML = `<span class="spinner inline-block mr-2"></span> Procesando Maestro de Terceros...`;

    try {
      const result = await API.uploadMaestroExcel(fileInput.files[0]);
      this.showToast(result.message || 'Maestro de Terceros actualizado correctamente.', 'success');
      fileInput.value = '';
      const label = document.getElementById('maestro-selected-file-name');
      if (label) label.classList.add('hidden');
      this.loadMaestroTerceros();
    } catch (err) {
      this.showToast(err.message || 'Error al procesar archivo.', 'error');
    } finally {
      btnUpload.disabled = false;
      btnUpload.textContent = 'Subir y Actualizar Maestro de Terceros';
    }
  },

  async handleSaveSingleTercero(e) {
    if (e) e.preventDefault();
    const nit = document.getElementById('m-nit').value.trim();
    const nombre = document.getElementById('m-nombre').value.trim();
    const email = document.getElementById('m-email').value.trim();
    const tipo = document.getElementById('m-tipo').value;

    if (!nit || !nombre || !email) {
      this.showToast('NIT, Nombre y Correo Electrónico son obligatorios.', 'warning');
      return;
    }

    try {
      await API.saveMaestroTercero({
        nit,
        razonSocial: nombre,
        email,
        tipoTercero: tipo
      });
      this.showToast(`Tercero ${nombre} guardado en el maestro exitosamente.`, 'success');
      document.getElementById('m-nit').value = '';
      document.getElementById('m-nombre').value = '';
      document.getElementById('m-email').value = '';
      this.loadMaestroTerceros();
    } catch (err) {
      this.showToast(err.message || 'Error al guardar tercero.', 'error');
    }
  },

  async handleDeleteMaestroTercero(id) {
    if (!confirm('¿Confirma que desea eliminar este tercero del directorio maestro?')) return;
    try {
      await API.deleteMaestroTercero(id);
      this.showToast('Tercero eliminado del maestro.', 'success');
      this.loadMaestroTerceros();
    } catch (err) {
      this.showToast(err.message || 'Error al eliminar tercero.', 'error');
    }
  },

  async handleClearMaestro() {
    if (!confirm('¡ADVERTENCIA CRÍTICA!\n\n¿Está seguro de vaciar completamente el Maestro de Terceros? Los proveedores y empleados no podrán solicitar OTP hasta que se cargue un nuevo archivo.')) return;
    try {
      const res = await API.clearMaestroTerceros();
      this.showToast(res.message || 'Maestro de terceros vaciado.', 'success');
      this.loadMaestroTerceros();
    } catch (err) {
      this.showToast('Error al vaciar maestro.', 'error');
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-[#234923] text-white border-l-4 border-[#C5922C]',
      error: 'bg-[#B31F24] text-white',
      warning: 'bg-[#C5922C] text-white',
      info: 'bg-[#3B5270] text-white'
    };

    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold toast-enter ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Expose globally
window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
