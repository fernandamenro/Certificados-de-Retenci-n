const xlsx = require('xlsx');

// Required column lists
const EXPECTED_RETENCIONES_COLUMNS = [
  'NIT',
  'TIPO DE CERTIFICADO',
  'CUENTA',
  'NOMBRE',
  'DESCRIPCION',
  'AÑO',
  'BASE',
  'VALOR'
];

const EXPECTED_FORMULARIO_220_COLUMNS = [
  'Entidad Informante',
  'Tipo de documento',
  'Número de identificación del beneficiario',
  'Primer apellido',
  'Segundo apellido',
  'Primer nombre',
  'Otros nombres',
  'Dirección del beneficiario',
  'Departamento del beneficiario',
  'Municipio del beneficiario',
  'País del beneficiario',
  'Pagos por salarios',
  'Pagos por emolumentos eclesiásticos',
  'Pagos realizados con bonos electrónicos o de papel de servicio, cheques, tarjetas, vales, etc.',
  'Valor del exceso de los pagos por alimentación mayores a 41 UVT, art.387-1 E.T.',
  'Pagos por honorarios',
  'Pagos por servicios',
  'Pagos por comisiones',
  'Pagos por prestaciones sociales',
  'Pagos por viáticos',
  'Pagos por gastos de representación',
  'Pagos por compensaciones de trabajo asociado cooperativo',
  'Valor apoyos económicos no reembolsables o condonados, entregados por el Estado o financiados con recursos públicos, para financiar programas educativos',
  'Otros pagos',
  'Cesantías e intereses de cesantías efectivamente pagadas al empleado.',
  'Cesantías consignadas al fondo de cesantías.',
  'Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo, Capítulo VII, Título VIII Parte Primera',
  'Pensiones de jubilación, vejez o invalidez',
  'Total, Ingresos brutos de rentas de trabajo y pensión',
  'Aportes Obligatorios por Salud a cargo del trabajador',
  'Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador',
  'Aportes voluntarios al régimen de ahorro individual con solidaridad – RAIS',
  'Aportes voluntarios a fondos de pensiones voluntarias',
  'Aportes a cuentas AFC',
  'Aportes a cuentas AVC',
  'Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones',
  'Impuesto sobre las ventas – IVA, mayor valor del costo o gasto',
  'Retención en la fuente a título de impuesto sobre las ventas – IVA',
  'Pagos por alimentación hasta a 41 UVT',
  'Valor ingreso laboral promedio de los últimos seis meses',
  'Tipo de documento del dependiente económico',
  'Número de Identificación del dependiente económico'
];

/**
 * Standardize text for loose column matching (strips accents, punctuation, extra spaces)
 */
function normalizeHeader(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalizes NIT/Cédula string: removes dots, spaces, commas.
 * If user or excel has "900.123.456-7", extracts base "900123456" for canonical search.
 */
function normalizeNit(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  
  // If it has hyphen (e.g. 900123456-7), take the left part if it's the DV
  let base = str;
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 2 && parts[1].trim().length <= 2) {
      base = parts[0];
    }
  }
  
  // Remove all non-digits
  const digitsOnly = base.replace(/\D/g, '');
  return digitsOnly || str.replace(/\s+/g, '');
}

/**
 * Clean currency and numeric values - guarantees absolute value (positive numbers)
 */
function cleanNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(Math.abs(val) * 100) / 100;
  
  let str = String(val).trim();
  if (!str) return 0;
  
  // Remove currency symbol, spaces, negative signs
  str = str.replace(/[$€COP\s]/gi, '');
  
  // Handle Spanish thousand separators vs decimal separators
  // e.g. "1.250.000,50" -> 1250000.50
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = parts[0].replace(/\./g, '') + '.' + parts[1];
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(str);
  // Rule: BASE and VALOR must always be strictly positive (absolute value)
  return isNaN(num) ? 0 : Math.round(Math.abs(num) * 100) / 100;
}

/**
 * Standardize certificate type string (RENTA, IVA, ICA)
 */
function normalizeCertType(val) {
  if (!val) return 'RENTA';
  const str = String(val).toUpperCase().trim();
  if (str.includes('IVA') || str.includes('RETEIVA')) return 'IVA';
  if (str.includes('ICA') || str.includes('RETEICA') || str.includes('INDUSTRIA')) return 'ICA';
  return 'RENTA';
}

/**
 * Parses and validates Structure 1: Retenciones Tributarias
 */
function parseRetencionesExcel(buffer, targetYear) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('El archivo Excel no contiene suficientes filas de datos.');
  }

  // Header row is row 0
  const headerRow = rawRows[0];
  const headerMap = {};
  headerRow.forEach((colName, index) => {
    headerMap[normalizeHeader(colName)] = index;
  });

  // Verify all expected columns are present
  const missingColumns = [];
  const columnIndices = {};

  EXPECTED_RETENCIONES_COLUMNS.forEach(expectedCol => {
    const norm = normalizeHeader(expectedCol);
    if (headerMap[norm] !== undefined) {
      columnIndices[expectedCol] = headerMap[norm];
    } else {
      missingColumns.push(expectedCol);
    }
  });

  if (missingColumns.length > 0) {
    throw new Error(
      `El archivo Excel no cumple con la estructura requerida. Faltan las siguientes columnas: ${missingColumns.join(', ')}`
    );
  }

  // Process rows
  const parsedRecords = [];
  let skippedRows = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue; // Skip empty row
    }

    const rawNit = row[columnIndices['NIT']];
    const normNit = normalizeNit(rawNit);
    if (!normNit) {
      skippedRows++;
      continue;
    }

    const certType = normalizeCertType(row[columnIndices['TIPO DE CERTIFICADO']]);
    const cuenta = String(row[columnIndices['CUENTA']] || '').trim();
    const nombre = String(row[columnIndices['NOMBRE']] || '').trim();
    const descripcion = String(row[columnIndices['DESCRIPCION']] || '').trim();
    
    let rowYear = parseInt(row[columnIndices['AÑO']], 10);
    if (isNaN(rowYear) || rowYear <= 1900) {
      rowYear = targetYear ? parseInt(targetYear, 10) : new Date().getFullYear() - 1;
    }

    // Regla de negocio: Los valores almacenados y procesados para BASE y VALOR deben ser siempre transformados a números positivos (valor absoluto)
    const base = Math.abs(cleanNumber(row[columnIndices['BASE']]));
    const valor = Math.abs(cleanNumber(row[columnIndices['VALOR']]));

    parsedRecords.push({
      id: `${normNit}-${certType}-${rowYear}-${i}-${Date.now()}`,
      nit: String(rawNit).trim(),
      normalizedNit: normNit,
      tipoCertificado: certType,
      cuenta,
      nombre,
      descripcion,
      ano: rowYear,
      base,
      valor,
      createdAt: new Date().toISOString()
    });
  }

  return {
    totalParsed: parsedRecords.length,
    skippedRows,
    records: parsedRecords
  };
}

/**
 * Consolidate Retenciones records for a specific NIT and Certificate Type
 * Groups by DESCRIPCION / CUENTA and sums base and valor
 */
function consolidateRetenciones(records) {
  if (!records || records.length === 0) return { items: [], totalBase: 0, totalValor: 0 };

  const groups = new Map();
  let providerName = '';
  let providerNit = '';
  let certType = '';
  let year = '';

  records.forEach(r => {
    if (!providerName && r.nombre) providerName = r.nombre;
    if (!providerNit && r.nit) providerNit = r.nit;
    if (!certType && r.tipoCertificado) certType = r.tipoCertificado;
    if (!year && r.ano) year = r.ano;

    const groupKey = `${(r.descripcion || 'RETENCIÓN').toUpperCase()}||${(r.cuenta || '').toUpperCase()}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        descripcion: r.descripcion || 'CONCEPTO GENERAL',
        cuenta: r.cuenta || '',
        base: 0,
        valor: 0
      });
    }

    const group = groups.get(groupKey);
    group.base += Math.abs(r.base || 0);
    group.valor += Math.abs(r.valor || 0);
  });

  const consolidatedItems = Array.from(groups.values()).map(item => ({
    ...item,
    base: Math.abs(item.base),
    valor: Math.abs(item.valor)
  })).sort((a, b) => b.valor - a.valor);
  
  const totalBase = Math.abs(consolidatedItems.reduce((acc, curr) => acc + curr.base, 0));
  const totalValor = Math.abs(consolidatedItems.reduce((acc, curr) => acc + curr.valor, 0));

  return {
    providerName,
    providerNit,
    certType,
    year,
    items: consolidatedItems,
    totalBase,
    totalValor
  };
}

/**
 * Parses and validates Structure 2: Formulario 220 (Empleados)
 */
function parseFormulario220Excel(buffer, targetYear) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('El archivo Excel no contiene suficientes filas de datos.');
  }

  const headerRow = rawRows[0];
  const headerMap = {};
  headerRow.forEach((colName, index) => {
    headerMap[normalizeHeader(colName)] = index;
  });

  // Check all 42 required columns
  const missingColumns = [];
  const columnIndices = {};

  EXPECTED_FORMULARIO_220_COLUMNS.forEach(expectedCol => {
    const norm = normalizeHeader(expectedCol);
    if (headerMap[norm] !== undefined) {
      columnIndices[expectedCol] = headerMap[norm];
    } else {
      missingColumns.push(expectedCol);
    }
  });

  if (missingColumns.length > 0) {
    throw new Error(
      `El archivo Excel no contiene todas las 42 columnas exactas del Formulario 220. Faltan ${missingColumns.length} columnas:\n` +
      missingColumns.slice(0, 10).join(', ') +
      (missingColumns.length > 10 ? ` y ${missingColumns.length - 10} más...` : '')
    );
  }

  const parsedRecords = [];
  let skippedRows = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue;
    }

    const rawId = row[columnIndices['Número de identificación del beneficiario']];
    const normNit = normalizeNit(rawId);
    if (!normNit) {
      skippedRows++;
      continue;
    }

    const fields = {};
    EXPECTED_FORMULARIO_220_COLUMNS.forEach(colName => {
      const val = row[columnIndices[colName]];
      // If it is a monetary/numeric field, clean it
      if (
        colName.startsWith('Pagos') ||
        colName.startsWith('Valor') ||
        colName.startsWith('Cesantías') ||
        colName.startsWith('Auxilio') ||
        colName.startsWith('Pensiones') ||
        colName.startsWith('Total') ||
        colName.startsWith('Aportes') ||
        colName.startsWith('Impuesto') ||
        colName.startsWith('Retención')
      ) {
        fields[colName] = cleanNumber(val);
      } else {
        fields[colName] = String(val !== undefined && val !== null ? val : '').trim();
      }
    });

    const parsedYear = targetYear ? parseInt(targetYear, 10) : (new Date().getFullYear() - 1);

    parsedRecords.push({
      id: `f220-${normNit}-${parsedYear}-${i}-${Date.now()}`,
      ano: parsedYear,
      nit: String(rawId).trim(),
      normalizedNit: normNit,
      primerApellido: fields['Primer apellido'] || '',
      segundoApellido: fields['Segundo apellido'] || '',
      primerNombre: fields['Primer nombre'] || '',
      otrosNombres: fields['Otros nombres'] || '',
      nombreCompleto: [
        fields['Primer apellido'],
        fields['Segundo apellido'],
        fields['Primer nombre'],
        fields['Otros nombres']
      ].filter(Boolean).join(' '),
      fields,
      createdAt: new Date().toISOString()
    });
  }

  return {
    totalParsed: parsedRecords.length,
    skippedRows,
    records: parsedRecords
  };
}

const EXPECTED_MAESTRO_TERCEROS_COLUMNS = [
  'NIT',
  'Razón Social / Nombre',
  'Correo Electrónico',
  'Tipo de Tercero'
];

/**
 * Parses Maestro de Terceros Excel or CSV buffer
 * Required columns: NIT, Razón Social / Nombre, Correo Electrónico, Tipo de Tercero
 */
function parseMaestroTercerosExcel(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rows || rows.length === 0) {
    throw new Error('El archivo Excel del Maestro de Terceros está vacío.');
  }

  // Find header row
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const stringified = row.map(cell => String(cell).trim().toUpperCase());
    const hasNit = stringified.some(c => c === 'NIT' || c.includes('IDENTIFICACI') || c === 'CEDULA');
    const hasNombre = stringified.some(c => c.includes('RAZON') || c.includes('NOMBRE'));
    const hasEmail = stringified.some(c => c.includes('CORREO') || c.includes('EMAIL'));

    if (hasNit && (hasNombre || hasEmail)) {
      headerRowIndex = i;
      headers = stringified;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Default to first row
    headerRowIndex = 0;
    headers = rows[0].map(c => String(c).trim().toUpperCase());
  }

  // Helper to find column index
  const findCol = (terms) => {
    return headers.findIndex(h => terms.some(t => h.includes(t)));
  };

  const colNit = findCol(['NIT', 'IDENTIFICAC', 'CEDULA', 'DOCUMENTO']);
  const colNombre = findCol(['RAZON', 'NOMBRE', 'TERCERO', 'BENEFICIARIO']);
  const colEmail = findCol(['CORREO', 'EMAIL', 'E-MAIL']);
  const colTipo = findCol(['TIPO']);

  if (colNit === -1) {
    throw new Error('No se encontró la columna requerida: "NIT" en el archivo de Maestro de Terceros.');
  }

  const records = [];
  let skippedRows = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawNit = colNit !== -1 ? String(row[colNit] || '').trim() : '';
    const normNit = normalizeNit(rawNit);

    if (!normNit) {
      skippedRows++;
      continue;
    }

    const rawNombre = colNombre !== -1 ? String(row[colNombre] || '').trim() : '';
    const rawEmail = colEmail !== -1 ? String(row[colEmail] || '').trim().toLowerCase() : '';
    const rawTipo = colTipo !== -1 ? String(row[colTipo] || '').trim().toLowerCase() : 'proveedor';

    let tipoTercero = 'proveedor';
    if (rawTipo.startsWith('emp')) {
      tipoTercero = 'empleado';
    } else if (rawTipo === 'ambos' || rawTipo === 'todos') {
      tipoTercero = 'ambos';
    }

    records.push({
      id: `tercero-${normNit}`,
      nit: rawNit || normNit,
      normalizedNit: normNit,
      razonSocial: (rawNombre || 'TERCERO REGISTRADO').toUpperCase(),
      email: rawEmail,
      tipoTercero,
      updatedAt: new Date().toISOString()
    });
  }

  return {
    totalParsed: records.length,
    skippedRows,
    records
  };
}

module.exports = {
  EXPECTED_RETENCIONES_COLUMNS,
  EXPECTED_FORMULARIO_220_COLUMNS,
  EXPECTED_MAESTRO_TERCEROS_COLUMNS,
  normalizeNit,
  cleanNumber,
  parseRetencionesExcel,
  consolidateRetenciones,
  parseFormulario220Excel,
  parseMaestroTercerosExcel
};
