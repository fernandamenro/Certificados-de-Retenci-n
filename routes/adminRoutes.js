const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { excelUpload, imageUpload } = require('../middleware/upload');
const {
  parseRetencionesExcel,
  parseFormulario220Excel,
  parseMaestroTercerosExcel
} = require('../services/excelParser');
const {
  generateRetencionesTemplateBuffer,
  generateFormulario220TemplateBuffer,
  generateMaestroTercerosTemplateBuffer
} = require('../services/templateGenerator');
const { testSmtpConnection } = require('../services/emailService');

// Public template download routes (Excel official blanks do not contain confidential data)
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

// Protect all remaining admin routes
router.use(authMiddleware);

/**
 * GET /api/admin/config
 */
router.get('/config', (req, res) => {
  res.json(db.getAgentConfig());
});

/**
 * PUT /api/admin/config
 */
router.put('/config', (req, res) => {
  try {
    const updated = db.updateAgentConfig(req.body);
    res.json({ message: 'Configuración actualizada exitosamente.', config: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la configuración institucional.' });
  }
});

/**
 * POST /api/admin/test-email
 * Diagnostic test to verify Google Workspace SMTP connection and send a test email
 */
router.post('/test-email', async (req, res) => {
  try {
    const { testRecipient, gworkspaceAppPassword, gworkspaceEmail, gworkspaceSmtpHost, gworkspaceSmtpPort } = req.body;
    const currentConfig = db.getAgentConfig();

    const senderEmail = gworkspaceEmail || currentConfig.gworkspaceEmail || 'contabilidad@primaveraurbana.com.co';
    const appPassword = gworkspaceAppPassword || currentConfig.gworkspaceAppPassword || process.env.GWORKSPACE_APP_PASSWORD || '';
    const smtpHost = gworkspaceSmtpHost || currentConfig.gworkspaceSmtpHost || 'smtp.gmail.com';
    const smtpPort = gworkspaceSmtpPort || currentConfig.gworkspaceSmtpPort || 465;

    const result = await testSmtpConnection({
      senderEmail,
      appPassword,
      smtpHost,
      smtpPort,
      testRecipient: testRecipient || senderEmail,
      agentConfig: currentConfig
    });

    res.json({
      success: true,
      message: `¡Conexión exitosa! Se envió un correo de prueba a ${result.recipient} desde ${result.sender}. Revise su bandeja de entrada.`,
      result
    });
  } catch (err) {
    console.error('Error testing Google Workspace email connection:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Error al conectar con el servidor SMTP de Google Workspace.'
    });
  }
});

/**
 * POST /api/admin/upload-signature
 */
router.post('/upload-signature', imageUpload.single('signature'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen de firma.' });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const updated = db.updateAgentConfig({ firmaDigitalBase64: base64Image });

    res.json({
      message: 'Firma digital cargada correctamente.',
      firmaDigitalBase64: updated.firmaDigitalBase64
    });
  } catch (err) {
    console.error('Error saving signature:', err);
    res.status(500).json({ error: 'Error al procesar la imagen de la firma.' });
  }
});

/**
 * POST /api/admin/upload-logo
 */
router.post('/upload-logo', imageUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen de logotipo.' });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const updated = db.updateAgentConfig({ logoBase64: base64Image });

    res.json({
      message: 'Logotipo institucional cargado correctamente.',
      logoBase64: updated.logoBase64
    });
  } catch (err) {
    console.error('Error saving logo:', err);
    res.status(500).json({ error: 'Error al procesar la imagen del logotipo.' });
  }
});

/**
 * GET /api/admin/issuance-dates
 */
router.get('/issuance-dates', (req, res) => {
  res.json({ dates: db.getIssuanceDates() });
});

/**
 * POST /api/admin/issuance-dates
 */
router.post('/issuance-dates', (req, res) => {
  const { year, certType, dateStr } = req.body;
  if (!year || !certType || !dateStr) {
    return res.status(400).json({ error: 'Debe especificar año, tipo de certificado y fecha.' });
  }

  const updatedDates = db.setIssuanceDate(year, certType, dateStr);
  res.json({ message: 'Fecha de expedición actualizada correctamente.', dates: updatedDates });
});

/**
 * POST /api/admin/upload-excel
 * Bulk upload processor for Retenciones or Formulario 220
 */
router.post('/upload-excel', excelUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor adjunte un archivo de Excel (.xlsx, .xls).' });
    }

    const category = (req.body.category || 'retenciones').toLowerCase();
    const year = req.body.year ? parseInt(req.body.year, 10) : new Date().getFullYear() - 1;

    if (category === 'retenciones') {
      const parsed = parseRetencionesExcel(req.file.buffer, year);
      const insertedCount = db.saveRetenciones(parsed.records);

      return res.json({
        success: true,
        category: 'retenciones',
        year,
        totalParsed: parsed.totalParsed,
        skippedRows: parsed.skippedRows,
        insertedCount,
        message: `Se importaron exitosamente ${insertedCount} registros de retenciones para la vigencia ${year}.`
      });
    } else if (category === 'formulario220') {
      const parsed = parseFormulario220Excel(req.file.buffer, year);
      const insertedCount = db.saveFormulario220(parsed.records);

      return res.json({
        success: true,
        category: 'formulario220',
        year,
        totalParsed: parsed.totalParsed,
        skippedRows: parsed.skippedRows,
        insertedCount,
        message: `Se importaron exitosamente ${insertedCount} certificados Formulario 220 de empleados para la vigencia ${year}.`
      });
    } else if (category === 'maestro' || category === 'maestro-terceros') {
      const parsed = parseMaestroTercerosExcel(req.file.buffer);
      const result = db.bulkSaveMaestroTerceros(parsed.records);

      return res.json({
        success: true,
        category: 'maestro-terceros',
        totalParsed: parsed.totalParsed,
        skippedRows: parsed.skippedRows,
        insertedCount: result.inserted,
        updatedCount: result.updated,
        totalInDb: result.total,
        message: `Se procesó el Maestro de Terceros: ${result.inserted} nuevos registros creados, ${result.updated} actualizados.`
      });
    } else {
      return res.status(400).json({ error: 'Categoría de carga desconocida.' });
    }
  } catch (err) {
    console.error('Error during Excel upload:', err);
    res.status(400).json({
      error: err.message || 'Error al procesar el archivo Excel. Verifique que cumpla las columnas requeridas.'
    });
  }
});

/**
 * Maestro de Terceros CRUD Routes
 */
router.get('/maestro-terceros', (req, res) => {
  try {
    const { search, tipo, page, limit } = req.query;
    const result = db.listMaestroTerceros({ search, tipo, page, limit });
    res.json(result);
  } catch (err) {
    console.error('Error listing maestro terceros:', err);
    res.status(500).json({ error: 'Error al listar el maestro de terceros.' });
  }
});

router.post('/maestro-terceros', (req, res) => {
  try {
    const { nit, razonSocial, email, tipoTercero } = req.body;
    if (!nit || !razonSocial) {
      return res.status(400).json({ error: 'NIT y Razón Social / Nombre son obligatorios.' });
    }
    const saved = db.saveMaestroTercero({ nit, razonSocial, email, tipoTercero });
    res.json({ message: 'Tercero guardado exitosamente.', tercero: saved });
  } catch (err) {
    console.error('Error saving maestro tercero:', err);
    res.status(500).json({ error: 'Error al guardar tercero en el maestro.' });
  }
});

router.post('/upload-maestro-terceros', excelUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor adjunte un archivo de Excel o CSV.' });
    }
    const parsed = parseMaestroTercerosExcel(req.file.buffer);
    const result = db.bulkSaveMaestroTerceros(parsed.records);

    res.json({
      success: true,
      totalParsed: parsed.totalParsed,
      skippedRows: parsed.skippedRows,
      insertedCount: result.inserted,
      updatedCount: result.updated,
      totalInDb: result.total,
      message: `Maestro de Terceros actualizado: ${result.inserted} creados, ${result.updated} actualizados (Total: ${result.total}).`
    });
  } catch (err) {
    console.error('Error uploading maestro terceros:', err);
    res.status(400).json({ error: err.message || 'Error al procesar archivo de Maestro de Terceros.' });
  }
});

router.get('/maestro-terceros/:id', (req, res) => {
  try {
    const tercero = db.getMaestroTerceroById(req.params.id);
    if (!tercero) {
      return res.status(404).json({ error: 'Tercero no encontrado en el maestro.' });
    }
    res.json(tercero);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar tercero.' });
  }
});

router.put('/maestro-terceros/:id', (req, res) => {
  try {
    const { nit, razonSocial, email, tipoTercero } = req.body;
    if (!nit || !razonSocial) {
      return res.status(400).json({ error: 'NIT y Razón Social / Nombre son obligatorios.' });
    }
    const updated = db.updateMaestroTercero(req.params.id, { nit, razonSocial, email, tipoTercero });
    if (!updated) {
      return res.status(404).json({ error: 'Tercero no encontrado en el maestro.' });
    }
    res.json({ message: 'Tercero actualizado exitosamente.', tercero: updated });
  } catch (err) {
    console.error('Error updating maestro tercero:', err);
    res.status(500).json({ error: 'Error al actualizar información del tercero.' });
  }
});

router.delete('/maestro-terceros/:id', (req, res) => {
  try {
    const deleted = db.deleteMaestroTercero(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Tercero no encontrado.' });
    }
    res.json({ message: 'Tercero eliminado del maestro exitosamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar tercero.' });
  }
});

router.delete('/maestro-terceros-clear', (req, res) => {
  try {
    const cleared = db.clearMaestroTerceros();
    res.json({ message: `Se limpiaron ${cleared} registros del Maestro de Terceros.` });
  } catch (err) {
    res.status(500).json({ error: 'Error al vaciar maestro de terceros.' });
  }
});



/**
 * GET /api/admin/stats
 */
router.get('/stats', (req, res) => {
  res.json(db.getStats());
});

module.exports = router;
