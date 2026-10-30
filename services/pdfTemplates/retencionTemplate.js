const { numeroALetras } = require('../numberToWords');

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  return '$ ' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Builds the pdfmake document definition for Retención (RENTA, IVA, ICA)
 */
function buildRetencionPdfDefinition(agentConfig, consolidatedData, issuanceDate) {
  const { providerName, providerNit, certType, year, items, totalBase, totalValor } = consolidatedData;

  let certTitle = 'CERTIFICADO DE RETENCIÓN EN LA FUENTE';
  let certSubtitle = `AÑO GRAVABLE ${year}`;
  let normType = (certType || 'RENTA').toUpperCase();

  if (normType === 'RENTA') {
    certTitle = 'CERTIFICADO DE RETENCIÓN EN LA FUENTE A TÍTULO DE RENTA';
  } else if (normType === 'IVA') {
    certTitle = 'CERTIFICADO DE RETENCIÓN EN LA FUENTE A TÍTULO DE IVA (IMPUESTO SOBRE LAS VENTAS)';
  } else if (normType === 'ICA') {
    certTitle = 'CERTIFICADO DE RETENCIÓN DEL IMPUESTO DE INDUSTRIA Y COMERCIO (ICA)';
  }

  const expDate = issuanceDate || `Expedido en ${agentConfig.ciudad || 'Villavicencio'}`;
  const valorEnLetras = numeroALetras(totalValor);

  // Helper to extract retention rate percentage from description
  function extractRetentionRate(descripcion, base, valor) {
    if (!descripcion) return '-';
    const str = String(descripcion).trim();

    // Pattern 1: Check for 'Tarifa XX%' or 'Tarifa XX % del IVA'
    const tarifaMatch = str.match(/Tarifa\s*(\d+(?:[.,]\d+)?\s*%(?:\s*del\s*IVA)?)/i);
    if (tarifaMatch) return tarifaMatch[1].trim();

    // Pattern 2: Check for 'XX por mil' or 'XX x 1000' or 'XX‰'
    const porMilMatch = str.match(/(\d+(?:[.,]\d+)?\s*(?:por\s*mil|x\s*1000|‰))/i);
    if (porMilMatch) return porMilMatch[1].trim();

    // Pattern 3: If there are multiple % matches, often the last one is the withholding rate (e.g. 'Gravados al 19% ... 15%')
    const allPercents = [...str.matchAll(/(\d+(?:[.,]\d+)?\s*%)/gi)];
    if (allPercents.length > 0) {
      return allPercents[allPercents.length - 1][1].trim();
    }

    // Fallback: calculate from base and valor
    if (base && valor && Number(base) > 0) {
      const rate = (Number(valor) / Number(base)) * 100;
      const rounded = Math.round(rate * 100) / 100;
      return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2)}%`;
    }

    return '-';
  }

  // Table rows with % RETENCIÓN replacing CUENTA
  const tableBody = [
    [
      { text: 'CONCEPTO / DESCRIPCIÓN DE LA RETENCIÓN', style: 'tableHeader', alignment: 'left' },
      { text: '% RETENCIÓN', style: 'tableHeader', alignment: 'center' },
      { text: 'BASE GRAVABLE ($)', style: 'tableHeader', alignment: 'right' },
      { text: 'VALOR RETENIDO ($)', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  items.forEach(item => {
    const rateStr = extractRetentionRate(item.descripcion, item.base, item.valor);
    tableBody.push([
      { text: item.descripcion || 'Retención General', style: 'tableCell', alignment: 'left' },
      { text: rateStr, style: 'tableCell', alignment: 'center' },
      { text: formatCurrency(item.base), style: 'tableCell', alignment: 'right' },
      { text: formatCurrency(item.valor), style: 'tableCellBold', alignment: 'right' }
    ]);
  });

  // Totals Row
  tableBody.push([
    { text: 'TOTALES CONSOLIDADOS', style: 'tableTotal', colSpan: 2, alignment: 'left' },
    {},
    { text: formatCurrency(totalBase), style: 'tableTotal', alignment: 'right' },
    { text: formatCurrency(totalValor), style: 'tableTotalValor', alignment: 'right' }
  ]);

  // Signatures section: Firma Autorizada (sin gráfico ni nombres específicos)
  const signatureElements = [
    {
      canvas: [{ type: 'line', x1: 50, y1: 0, x2: 250, y2: 0, lineWidth: 1, lineColor: '#234923' }],
      alignment: 'center',
      margin: [0, 35, 0, 6]
    },
    {
      text: 'Firma Autorizada',
      bold: true,
      fontSize: 9.5,
      alignment: 'center',
      color: '#234923'
    }
  ];

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 35, 40, 35],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 9,
      color: '#1e293b'
    },
    styles: {
      mainHeader: {
        fontSize: 12,
        bold: true,
        color: '#234923',
        alignment: 'center'
      },
      headerSub: {
        fontSize: 8,
        color: '#3B5270',
        alignment: 'center'
      },
      certTitle: {
        fontSize: 10.5,
        bold: true,
        color: '#234923',
        alignment: 'center'
      },
      certSubtitle: {
        fontSize: 9.5,
        bold: true,
        color: '#C5922C',
        alignment: 'center'
      },
      sectionLabel: {
        fontSize: 7.5,
        bold: true,
        color: '#3B5270'
      },
      sectionValue: {
        fontSize: 9,
        bold: true,
        color: '#1e293b'
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: '#ffffff',
        fillColor: '#234923',
        margin: [4, 6, 4, 6]
      },
      tableCell: {
        fontSize: 8.5,
        color: '#334155',
        margin: [4, 5, 4, 5]
      },
      tableCellBold: {
        fontSize: 8.5,
        bold: true,
        color: '#234923',
        margin: [4, 5, 4, 5]
      },
      tableTotal: {
        fontSize: 8.5,
        bold: true,
        color: '#234923',
        fillColor: '#F4F7F6',
        margin: [4, 6, 4, 6]
      },
      tableTotalValor: {
        fontSize: 9,
        bold: true,
        color: '#234923',
        fillColor: '#F4F7F6',
        margin: [4, 6, 4, 6]
      },
      legalText: {
        fontSize: 7,
        color: '#64748b',
        alignment: 'justify',
        lineHeight: 1.2
      }
    },
    content: [
      // Top Institutional Header Box with Logo & Branding
      {
        table: {
          widths: agentConfig.logoBase64 ? ['20%', '80%'] : ['*'],
          body: [
            agentConfig.logoBase64 ? [
              {
                fillColor: '#F4F7F6',
                border: [true, true, false, true],
                borderColor: ['#C5922C', '#C5922C', '#C5922C', '#C5922C'],
                alignment: 'center',
                margin: [6, 8, 6, 8],
                image: agentConfig.logoBase64,
                width: 65
              },
              {
                fillColor: '#F4F7F6',
                border: [false, true, true, true],
                borderColor: ['#C5922C', '#C5922C', '#C5922C', '#C5922C'],
                margin: [4, 8, 10, 8],
                stack: [
                  { text: (agentConfig.razonSocial || 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA CENTRO COMERCIAL Y EMPRESARIAL').toUpperCase(), style: 'mainHeader' },
                  { text: `NIT: ${agentConfig.nit || '901003351'}-${agentConfig.dv || '2'} • AGENTE RETENEDOR`, style: 'headerSub', bold: true, margin: [0, 2, 0, 1] },
                  { text: `${agentConfig.direccion || 'Calle 15 No. 40 - 01'} • ${agentConfig.ciudad || 'Villavicencio'}, ${agentConfig.departamento || 'Meta'} • Tel: ${agentConfig.telefono || '310 689 0750'}`, style: 'headerSub' },
                  { text: `Correo: ${agentConfig.email || 'contabilidad@primaveraurbana.com.co'}`, style: 'headerSub', margin: [0, 1, 0, 0] }
                ]
              }
            ] : [
              {
                fillColor: '#F4F7F6',
                border: [true, true, true, true],
                borderColor: ['#C5922C', '#C5922C', '#C5922C', '#C5922C'],
                margin: [10, 8, 10, 8],
                stack: [
                  { text: (agentConfig.razonSocial || 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA CENTRO COMERCIAL Y EMPRESARIAL').toUpperCase(), style: 'mainHeader' },
                  { text: `NIT: ${agentConfig.nit || '901003351'}-${agentConfig.dv || '2'} • AGENTE RETENEDOR`, style: 'headerSub', bold: true, margin: [0, 2, 0, 1] },
                  { text: `${agentConfig.direccion || 'Calle 15 No. 40 - 01'} • ${agentConfig.ciudad || 'Villavicencio'}, ${agentConfig.departamento || 'Meta'} • Tel: ${agentConfig.telefono || '310 689 0750'}`, style: 'headerSub' },
                  { text: `Correo: ${agentConfig.email || 'contabilidad@primaveraurbana.com.co'}`, style: 'headerSub', margin: [0, 1, 0, 0] }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },

      // Certificate Title Box
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#ffffff',
                border: [true, true, true, true],
                borderColor: ['#234923', '#234923', '#234923', '#234923'],
                margin: [8, 6, 8, 6],
                stack: [
                  { text: certTitle, style: 'certTitle' },
                  { text: certSubtitle, style: 'certSubtitle', margin: [0, 2, 0, 0] },
                  { 
                    text: `Ciudad de Expedición: Villavicencio (Meta) • Fecha de Expedición: ${expDate}`, 
                    fontSize: 8, 
                    alignment: 'center', 
                    color: '#3B5270', 
                    margin: [0, 2, 0, 0] 
                  }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },

      // Vendor Data Section
      {
        table: {
          widths: ['60%', '40%'],
          body: [
            [
              {
                border: [true, true, false, true],
                borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
                fillColor: '#ffffff',
                margin: [8, 6, 8, 6],
                stack: [
                  { text: 'BENEFICIARIO DEL PAGO (PROVEEDOR):', style: 'sectionLabel' },
                  { text: providerName || 'PROVEEDOR GENERAL', style: 'sectionValue', margin: [0, 2, 0, 0] }
                ]
              },
              {
                border: [false, true, true, true],
                borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
                fillColor: '#ffffff',
                margin: [8, 6, 8, 6],
                stack: [
                  { text: 'NIT / CÉDULA DE CIUDADANÍA:', style: 'sectionLabel' },
                  { text: providerNit || '', style: 'sectionValue', margin: [0, 2, 0, 0] }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },

      // Table of Consolidated Concepts
      {
        table: {
          headerRows: 1,
          widths: ['*', 80, 100, 105],
          body: tableBody
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#C5922C',
          vLineColor: () => '#e2e8f0'
        },
        margin: [0, 0, 0, 10]
      },

      // Total in Spanish Words Box
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#F4F7F6',
                border: [true, true, true, true],
                borderColor: ['#C5922C', '#C5922C', '#C5922C', '#C5922C'],
                margin: [8, 5, 8, 5],
                stack: [
                  { text: 'TOTAL RETENIDO EN LETRAS:', style: 'sectionLabel' },
                  { text: `SON: ${valorEnLetras} M/CTE`, bold: true, fontSize: 8.5, color: '#234923', margin: [0, 2, 0, 0] }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 10]
      },

      // Legal Disclaimer Notice
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#ffffff',
                border: [true, true, true, true],
                borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
                margin: [8, 6, 8, 6],
                stack: [
                  {
                    text: [
                      { text: 'CUMPLIMIENTO NORMATIVO Y LEGAL: ', bold: true, color: '#234923' },
                      'Este certificado se expide para dar cumplimiento a lo previsto en el artículo 381 del Estatuto tributario.\nEste documento no requiere firma autógrafa para su validez de acuerdo con los artículos 10 del Decreto 836 de 1991 y el articulo 7 del Decreto 380 de 1996, recopilados respectivamente en los artículos 1.6.1.12.12 y 1.6.1.12.13 del Decreto único reglamentario 1625 de 2016.'
                    ],
                    style: 'legalText'
                  }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 16]
      },

      // Institutional Signatures Block
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 320,
            stack: signatureElements
          },
          { width: '*', text: '' }
        ]
      }
    ]
  };

  return docDefinition;
}

module.exports = {
  buildRetencionPdfDefinition
};
