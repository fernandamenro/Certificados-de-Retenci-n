const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

/**
 * GET /api/admin/records/retenciones
 */
router.get('/retenciones', (req, res) => {
  const { year, nit, page, limit } = req.query;
  const result = db.listRetenciones({ year, nit, page, limit });
  res.json(result);
});

/**
 * DELETE /api/admin/records/retenciones
 */
router.delete('/retenciones', (req, res) => {
  const { year, certType } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Debe especificar el año a eliminar.' });
  }

  const deleted = db.deleteRetenciones({ year, certType });
  res.json({
    message: `Se eliminaron ${deleted} registros de retenciones para el año ${year}.`,
    deleted
  });
});

/**
 * GET /api/admin/records/formulario220
 */
router.get('/formulario220', (req, res) => {
  const { year, nit, page, limit } = req.query;
  const result = db.listFormulario220({ year, nit, page, limit });
  res.json(result);
});

/**
 * DELETE /api/admin/records/formulario220
 */
router.delete('/formulario220', (req, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Debe especificar el año a eliminar.' });
  }

  const deleted = db.deleteFormulario220({ year });
  res.json({
    message: `Se eliminaron ${deleted} registros de Formulario 220 para el año ${year}.`,
    deleted
  });
});

module.exports = router;
