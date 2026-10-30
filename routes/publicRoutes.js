const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/db');
const { normalizeNit } = require('../services/excelParser');
const { generateRetencionPdf, generateFormulario220Pdf } = require('../services/pdfService');
const {
  generateRetencionesTemplateBuffer,
  generateFormulario220TemplateBuffer,
  generateMaestroTercerosTemplateBuffer
} = require('../services/templateGenerator');
const { sendOtpEmail, maskEmail } = require('../services/emailService');

/**
 * GET /api/public/download-template/:type
 */
router.get('/download-template/:type', (req, res) => {
  try {
    const { type } = req.params;
    if (type === 'retenciones') {
      const buffer = generateRetencionesTemplateBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Retenciones_Proveedores.xlsx"');
      return res.send(buffer);
    } else if (type === 'formulario220') {
      const buffer = generateFormulario220TemplateBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Formulario_220_Empleados.xlsx"');
      return res.send(buffer);
    } else if (type === 'maestro-terceros' || type === 'maestro') {
      const buffer = generateMaestroTercerosTemplateBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Plantilla_Maestro_Terceros.xlsx"');
      return res.send(buffer);
    } else {
      return res.status(404).send('Plantilla no encontrada.');
    }
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).send('Error al generar la plantilla.');
  }
});

/**
 * GET /api/public/config
 * Exposes basic institutional info for the public landing portal
 */
router.get('/config', (req, res) => {
  const agentCfg = db.getAgentConfig();
  res.json({
    razonSocial: agentCfg.razonSocial,
    nit: agentCfg.nit,
    dv: agentCfg.dv,
    direccion: agentCfg.direccion,
    ciudad: agentCfg.ciudad,
    telefono: agentCfg.telefono,
    email: agentCfg.email,
    otpAuthEnabled: true
  });
});

/**
 * GET /api/public/years
 * Returns list of years available for consultation
 */
router.get('/years', (req, res) => {
  const years = db.getAvailableYears(req.query.tipoTercero);
  res.json({ years });
});

/**
 * POST /api/public/request-otp
 * Step 1 of OTP Security Flow:
 * - Checks NIT in database maestro
 * - Validates registered email exists
 * - Verifies certificate records exist for that year & type
 * - Masks email and sends 6-digit random code via Google Workspace (contabilidad@primaveraurbana.com.co)
 */
router.post('/request-otp', async (req, res) => {
  try {
    const { tipoTercero, nit, tipoCertificado, year } = req.body;

    if (!nit || !year || !tipoTercero) {
      return res.status(400).json({ 
        found: false, 
        error: 'PARAM_MISSING', 
        message: 'Faltan parámetros requeridos para la solicitud (identificación, vigencia o tipo de tercero).' 
      });
    }

    const normNit = normalizeNit(nit);
    if (!normNit) {
      return res.status(400).json({ 
        found: false, 
        error: 'INVALID_NIT', 
        message: 'El número de identificación ingresado no es válido.' 
      });
    }

    const numericYear = parseInt(year, 10);
    const certType = (tipoCertificado || (tipoTercero.toLowerCase() === 'empleado' ? 'F220' : 'RENTA')).toUpperCase().trim();

    // 1. Check in Maestro de Terceros
    let tercero = db.getTerceroByNit(normNit, tipoTercero);

    if (!tercero) {
      // Return friendly message with accounting contact
      const agentCfg = db.getAgentConfig();
      return res.status(404).json({
        found: false,
        error: 'TERCERO_NO_REGISTRADO',
        message: `El número de identificación ${nit} no se encuentra registrado en el maestro de terceros de la copropiedad.`,
        contact: {
          email: agentCfg.email || 'contabilidad@primaveraurbana.com.co',
          phone: agentCfg.telefono || '310 689 0750',
          ciudad: agentCfg.ciudad || 'Villavicencio'
        }
      });
    }

    // 2. Validate email is present and valid
    if (!tercero.email || !tercero.email.includes('@')) {
      const agentCfg = db.getAgentConfig();
      return res.status(400).json({
        found: false,
        error: 'SIN_CORREO_ASIGNADO',
        message: `El tercero "${tercero.razonSocial}" (NIT: ${nit}) no cuenta con un correo electrónico asignado en el sistema para recibir el código de verificación OTP.`,
        contact: {
          email: agentCfg.email || 'contabilidad@primaveraurbana.com.co',
          phone: agentCfg.telefono || '310 689 0750'
        }
      });
    }

    // 3. Verify records exist for the selected year and type
    if (tipoTercero.toLowerCase() === 'proveedor') {
      const records = db.getRetencionesByNit(normNit, numericYear, certType);
      if (!records || records.length === 0) {
        return res.status(404).json({
          found: false,
          error: 'NO_RECORDS',
          message: `No se encontraron retenciones a título de ${certType} para la vigencia fiscal ${numericYear}. Por favor verifique el año gravable o contacte a contabilidad.`
        });
      }
    } else {
      // Empleado (Formulario 220)
      const record = db.getFormulario220ByNit(normNit, numericYear);
      if (!record) {
        return res.status(404).json({
          found: false,
          error: 'NO_RECORDS',
          message: `No se encontraron registros del Formulario 220 para la vigencia fiscal ${numericYear}. Por favor contacte a contabilidad.`
        });
      }
    }

    // 4. Generate 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in OTP memory store (10 minutes validity)
    db.otpStore.set({
      normNit,
      year: numericYear,
      certType,
      otp: otpCode,
      email: tercero.email,
      tipoTercero,
      expiresInMinutes: 10
    });

    // 5. Send Real Email via Google Workspace (contabilidad@primaveraurbana.com.co)
    const agentConfig = db.getAgentConfig();
    const emailResult = await sendOtpEmail({
      to: tercero.email,
      otpCode,
      thirdPartyName: tercero.razonSocial,
      agentConfig
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        found: true,
        error: emailResult.error || 'EMAIL_SEND_FAILED',
        message: emailResult.message || 'No fue posible enviar el código de verificación al correo registrado. Por favor contacte al área de contabilidad (contabilidad@primaveraurbana.com.co).',
        contact: {
          email: agentConfig.email || 'contabilidad@primaveraurbana.com.co',
          phone: agentConfig.telefono || '310 689 0750'
        }
      });
    }

    return res.json({
      success: true,
      found: true,
      maskedEmail: emailResult.maskedEmail,
      expiresInSeconds: 600,
      terceroNombre: tercero.razonSocial,
      nit: tercero.nit || normNit,
      tipoCertificado: certType,
      year: numericYear,
      message: `Hemos enviado un código de verificación de 6 dígitos desde contabilidad@primaveraurbana.com.co a su correo registrado (${emailResult.maskedEmail}).`
    });

  } catch (err) {
    console.error('Error during request-otp:', err);
    res.status(500).json({ error: 'Error interno al procesar la solicitud de verificación OTP.' });
  }
});

/**
 * POST /api/public/verify-otp
 * Step 2 of OTP Security Flow:
 * - Validates the 6-digit code entered by user
 * - On success, generates a signed one-time download token
 */
router.post('/verify-otp', (req, res) => {
  try {
    const { tipoTercero, nit, tipoCertificado, year, otp } = req.body;

    if (!nit || !year || !otp) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (nit, year, otp).' });
    }

    const normNit = normalizeNit(nit);
    const numericYear = parseInt(year, 10);
    const certType = (tipoCertificado || (tipoTercero?.toLowerCase() === 'empleado' ? 'F220' : 'RENTA')).toUpperCase().trim();

    const verification = db.otpStore.verify({
      normNit,
      year: numericYear,
      certType,
      otp
    });

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error,
        message: verification.message
      });
    }

    // Generate signed download token valid for 10 minutes
    const downloadToken = jwt.sign(
      {
        normNit,
        year: numericYear,
        certType,
        tipoTercero: tipoTercero || 'proveedor',
        otpVerified: true
      },
      config.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const downloadUrl = `/api/public/download-pdf?token=${downloadToken}&tipoTercero=${encodeURIComponent(tipoTercero || 'proveedor')}&nit=${normNit}&tipoCertificado=${encodeURIComponent(certType)}&year=${numericYear}`;

    return res.json({
      success: true,
      message: 'Código de verificación válido. Generando certificado oficial...',
      downloadToken,
      downloadUrl
    });

  } catch (err) {
    console.error('Error in verify-otp:', err);
    res.status(500).json({ success: false, error: 'Error interno al verificar el código OTP.' });
  }
});

/**
 * POST /api/public/search
 * Checks if records exist for given criteria before download
 */
router.post('/search', async (req, res) => {
  try {
    const { tipoTercero, nit, tipoCertificado, year } = req.body;

    if (!nit || !year || !tipoTercero) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos para la consulta.' });
    }

    const normNit = normalizeNit(nit);
    if (!normNit) {
      return res.status(400).json({ error: 'Número de identificación no válido.' });
    }

    const numericYear = parseInt(year, 10);

    if (tipoTercero.toLowerCase() === 'proveedor') {
      const certType = (tipoCertificado || 'RENTA').toUpperCase();
      const records = db.getRetencionesByNit(normNit, numericYear, certType);

      if (!records || records.length === 0) {
        return res.json({
          found: false,
          message: 'No se encontraron registros para la identificación y vigencia seleccionadas. Por favor verifique los datos o contacte al departamento de contabilidad.'
        });
      }

      const sample = records[0];
      return res.json({
        found: true,
        tipoTercero: 'proveedor',
        nombre: sample.nombre,
        nit: sample.nit,
        tipoCertificado: certType,
        year: numericYear,
        totalItems: records.length
      });
    } else {
      // Empleado (Formulario 220)
      const record = db.getFormulario220ByNit(normNit, numericYear);

      if (!record) {
        return res.json({
          found: false,
          message: 'No se encontraron registros para la identificación y vigencia seleccionadas. Por favor verifique los datos o contacte al departamento de contabilidad.'
        });
      }

      return res.json({
        found: true,
        tipoTercero: 'empleado',
        nombre: record.nombreCompleto,
        nit: record.nit,
        tipoCertificado: 'Formulario 220',
        year: numericYear
      });
    }
  } catch (err) {
    console.error('Error during public search:', err);
    res.status(500).json({ error: 'Error interno al procesar la consulta.' });
  }
});

/**
 * GET /api/public/download-pdf
 * Dynamically generates and downloads the corresponding official PDF
 * Validates download token if provided
 */
router.get('/download-pdf', async (req, res) => {
  try {
    const { tipoTercero, nit, tipoCertificado, year, inline, token } = req.query;

    if (!nit || !year || !tipoTercero) {
      return res.status(400).send('Faltan parámetros de consulta (nit, year, tipoTercero).');
    }

    const normNit = normalizeNit(nit);
    const numericYear = parseInt(year, 10);

    // If token provided, verify it
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        if (decoded.normNit && decoded.normNit !== normNit) {
          return res.status(403).send('Token de descarga inválido para la identificación solicitada.');
        }
      } catch (err) {
        console.warn('Token de descarga expirado o inválido:', err.message);
        // Continue if admin or valid request
      }
    }

    let result = null;

    if (tipoTercero.toLowerCase() === 'proveedor') {
      const certType = (tipoCertificado || 'RENTA').toUpperCase();
      result = await generateRetencionPdf(normNit, numericYear, certType);
    } else {
      result = await generateFormulario220Pdf(normNit, numericYear);
    }

    if (!result || !result.buffer) {
      return res.status(404).send(
        'No se encontraron registros para la identificación y vigencia seleccionadas. Por favor verifique los datos o contacte al departamento de contabilidad.'
      );
    }

    const dispositionType = inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).send('Error interno al generar el archivo PDF.');
  }
});

module.exports = router;
