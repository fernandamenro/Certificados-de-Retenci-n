const PdfPrinter = require('pdfmake');
const db = require('../database/db');
const { consolidateRetenciones } = require('./excelParser');
const { buildRetencionPdfDefinition } = require('./pdfTemplates/retencionTemplate');
const { buildFormulario220PdfDefinition } = require('./pdfTemplates/formulario220Template');

// Standard fonts definition for pdfmake (no external TTF files required)
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

/**
 * Creates a readable stream for a given pdfmake document definition
 */
function createPdfStream(docDefinition) {
  return printer.createPdfKitDocument(docDefinition);
}

/**
 * Generates a PDF buffer from a document definition
 */
function generatePdfBuffer(docDefinition) {
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', err => reject(err));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates Retención PDF (RENTA, IVA, ICA)
 */
async function generateRetencionPdf(normalizedNit, year, certType) {
  const records = db.getRetencionesByNit(normalizedNit, year, certType);
  if (!records || records.length === 0) {
    return null;
  }

  const agentConfig = db.getAgentConfig();
  const issuanceDate = db.getIssuanceDate(year, certType);
  const consolidated = consolidateRetenciones(records);

  const docDefinition = buildRetencionPdfDefinition(agentConfig, consolidated, issuanceDate);
  const buffer = await generatePdfBuffer(docDefinition);

  const filename = `Certificado_${certType.toUpperCase()}_${year}_NIT_${normalizedNit}.pdf`;

  return {
    buffer,
    filename,
    consolidated
  };
}

/**
 * Generates Formulario 220 PDF
 */
async function generateFormulario220Pdf(normalizedNit, year) {
  const record = db.getFormulario220ByNit(normalizedNit, year);
  if (!record) {
    return null;
  }

  const agentConfig = db.getAgentConfig();
  const issuanceDate = db.getIssuanceDate(year, 'F220');

  const docDefinition = buildFormulario220PdfDefinition(agentConfig, record, issuanceDate);
  const buffer = await generatePdfBuffer(docDefinition);

  const filename = `Formulario_220_${year}_ID_${normalizedNit}.pdf`;

  return {
    buffer,
    filename,
    record
  };
}

module.exports = {
  createPdfStream,
  generatePdfBuffer,
  generateRetencionPdf,
  generateFormulario220Pdf
};
