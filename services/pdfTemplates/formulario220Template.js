function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  return '$ ' + Math.round(Number(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Builds the official replica of DIAN Formulario 220
 */
function buildFormulario220PdfDefinition(agentConfig, record, issuanceDate) {
  const fields = record.fields || {};
  const year = record.ano || new Date().getFullYear() - 1;
  const expDate = issuanceDate || `Villavicencio (Meta), ${year + 1}`;

  const tipoDoc = fields['Tipo de documento'] || 'CC';
  const numId = fields['Número de identificación del beneficiario'] || record.nit || '';
  const pApellido = (fields['Primer apellido'] || '').toUpperCase();
  const sApellido = (fields['Segundo apellido'] || '').toUpperCase();
  const pNombre = (fields['Primer nombre'] || '').toUpperCase();
  const oNombre = (fields['Otros nombres'] || '').toUpperCase();
  const direccion = fields['Dirección del beneficiario'] || '';
  const dpto = fields['Departamento del beneficiario'] || '';
  const muni = fields['Municipio del beneficiario'] || '';

  // Helper row builder for DIAN numbered casillas
  function casillaRow(num, label, value, isTotal = false) {
    const formattedVal = typeof value === 'number' ? formatCurrency(value) : (value || '$ 0');
    return [
      {
        text: String(num),
        style: isTotal ? 'casillaNumTotal' : 'casillaNum',
        alignment: 'center'
      },
      {
        text: label,
        style: isTotal ? 'casillaLabelTotal' : 'casillaLabel',
        alignment: 'left'
      },
      {
        text: formattedVal,
        style: isTotal ? 'casillaValTotal' : 'casillaVal',
        alignment: 'right'
      }
    ];
  }

  // DIAN Casillas Table
  const tableRows = [
    // Header for Conceptos
    [
      { text: 'No.', style: 'gridHeader', alignment: 'center' },
      { text: 'CONCEPTO DE LOS INGRESOS', style: 'gridHeader', alignment: 'left' },
      { text: 'VALOR ($ COP)', style: 'gridHeader', alignment: 'right' }
    ],
    casillaRow(32, 'Pagos por salarios', fields['Pagos por salarios']),
    casillaRow(33, 'Pagos por emolumentos eclesiásticos', fields['Pagos por emolumentos eclesiásticos']),
    casillaRow(34, 'Pagos con bonos electrónicos o papel de servicio, cheques, tarjetas, vales, etc.', fields['Pagos realizados con bonos electrónicos o de papel de servicio, cheques, tarjetas, vales, etc.']),
    casillaRow(35, 'Valor del exceso pagos alimentación mayores a 41 UVT (Art. 387-1 E.T.)', fields['Valor del exceso de los pagos por alimentación mayores a 41 UVT, art.387-1 E.T.']),
    casillaRow(36, 'Pagos por honorarios', fields['Pagos por honorarios']),
    casillaRow(37, 'Pagos por servicios', fields['Pagos por servicios']),
    casillaRow(38, 'Pagos por comisiones', fields['Pagos por comisiones']),
    casillaRow(39, 'Pagos por prestaciones sociales', fields['Pagos por prestaciones sociales']),
    casillaRow(40, 'Pagos por viáticos', fields['Pagos por viáticos']),
    casillaRow(41, 'Pagos por gastos de representación', fields['Pagos por gastos de representación']),
    casillaRow(42, 'Pagos por compensaciones trabajo asociado cooperativo', fields['Pagos por compensaciones de trabajo asociado cooperativo']),
    casillaRow(43, 'Apoyos económicos no reembolsables o condonados para programas educativos', fields['Valor apoyos económicos no reembolsables o condonados, entregados por el Estado o financiados con recursos públicos, para financiar programas educativos']),
    casillaRow(44, 'Otros pagos', fields['Otros pagos']),
    casillaRow(45, 'Cesantías e intereses de cesantías efectivamente pagadas al empleado', fields['Cesantías e intereses de cesantías efectivamente pagadas al empleado.']),
    casillaRow(46, 'Cesantías consignadas al fondo de cesantías', fields['Cesantías consignadas al fondo de cesantías.']),
    casillaRow(47, 'Auxilio de cesantías régimen tradicional CST', fields['Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo, Capítulo VII, Título VIII Parte Primera']),
    casillaRow(48, 'Pensiones de jubilación, vejez o invalidez', fields['Pensiones de jubilación, vejez o invalidez']),
    casillaRow(49, 'TOTAL INGRESOS BRUTOS DE RENTAS DE TRABAJO Y PENSIÓN (Suma 32 a 48)', fields['Total, Ingresos brutos de rentas de trabajo y pensión'], true),

    // Subheader Aportes
    [
      { text: '', style: 'subHeaderRow' },
      { text: 'CONCEPTO DE LOS APORTES Y RETENCIONES', style: 'subHeaderRow', colSpan: 2 },
      {}
    ],
    casillaRow(50, 'Aportes obligatorios por salud a cargo del trabajador', fields['Aportes Obligatorios por Salud a cargo del trabajador']),
    casillaRow(51, 'Aportes obligatorios a fondos de pensiones y solidaridad pensional', fields['Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador']),
    casillaRow(52, 'Aportes voluntarios a fondos de pensiones obligatorias (RAIS)', fields['Aportes voluntarios al régimen de ahorro individual con solidaridad – RAIS']),
    casillaRow(53, 'Aportes voluntarios a fondos de pensiones voluntarias', fields['Aportes voluntarios a fondos de pensiones voluntarias']),
    casillaRow(54, 'Aportes a cuentas AFC', fields['Aportes a cuentas AFC']),
    casillaRow(55, 'Aportes a cuentas AVC', fields['Aportes a cuentas AVC']),
    casillaRow(56, 'VALOR DE LAS RETENCIONES EN LA FUENTE POR RENTAS DE TRABAJO O PENSIONES', fields['Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones'], true),
    casillaRow(57, 'Impuesto sobre las ventas – IVA, mayor valor del costo o gasto', fields['Impuesto sobre las ventas – IVA, mayor valor del costo o gasto']),
    casillaRow(58, 'Retención en la fuente a título de impuesto sobre las ventas – IVA', fields['Retención en la fuente a título de impuesto sobre las ventas – IVA']),

    // Subheader Otros Datos y Dependientes
    [
      { text: '', style: 'subHeaderRow' },
      { text: 'DATOS DE DEPENDIENTES ECONÓMICOS Y OTROS CONCEPTOS', style: 'subHeaderRow', colSpan: 2 },
      {}
    ],
    casillaRow(59, 'Tipo de documento del dependiente económico', fields['Tipo de documento del dependiente económico'] || 'N/A'),
    casillaRow(60, 'Número de identificación del dependiente económico', fields['Número de Identificación del dependiente económico'] || 'N/A'),
    casillaRow(61, 'Pagos por alimentación hasta a 41 UVT', fields['Pagos por alimentación hasta a 41 UVT']),
    casillaRow(62, 'Valor ingreso laboral promedio de los últimos seis meses', fields['Valor ingreso laboral promedio de los últimos seis meses'])
  ];

  const signatureElements = [];
  if (agentConfig.firmaDigitalBase64) {
    signatureElements.push({
      image: agentConfig.firmaDigitalBase64,
      width: 120,
      alignment: 'center',
      margin: [0, 0, 0, 2]
    });
  } else {
    signatureElements.push({ text: '', margin: [0, 20, 0, 0] });
  }

  signatureElements.push(
    { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#334155' }], alignment: 'center', margin: [0, 3, 0, 3] },
    { text: agentConfig.representanteLegal || 'REPRESENTANTE LEGAL', bold: true, fontSize: 8, alignment: 'center' },
    { text: 'Firma del Pagador o Agente Retenedor', fontSize: 7, color: '#64748b', alignment: 'center' }
  );

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [30, 25, 30, 25],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 7.5,
      color: '#0f172a'
    },
    styles: {
      dianTitle: {
        fontSize: 10,
        bold: true,
        color: '#ffffff',
        alignment: 'center'
      },
      dianSubtitle: {
        fontSize: 8,
        color: '#e2e8f0',
        alignment: 'center'
      },
      dianYear: {
        fontSize: 14,
        bold: true,
        color: '#ffffff',
        alignment: 'center'
      },
      boxHeader: {
        fontSize: 6.5,
        bold: true,
        color: '#1e293b',
        fillColor: '#e2e8f0'
      },
      fieldLabel: {
        fontSize: 6,
        bold: true,
        color: '#475569'
      },
      fieldValue: {
        fontSize: 7.5,
        bold: true,
        color: '#0f172a'
      },
      gridHeader: {
        fontSize: 7,
        bold: true,
        color: '#ffffff',
        fillColor: '#065f46',
        margin: [2, 3, 2, 3]
      },
      subHeaderRow: {
        fontSize: 6.5,
        bold: true,
        color: '#065f46',
        fillColor: '#d1fae5',
        margin: [2, 2, 2, 2]
      },
      casillaNum: {
        fontSize: 6.5,
        bold: true,
        color: '#065f46',
        fillColor: '#f0fdf4',
        margin: [1, 1.5, 1, 1.5]
      },
      casillaLabel: {
        fontSize: 6.5,
        color: '#1e293b',
        margin: [3, 1.5, 2, 1.5]
      },
      casillaVal: {
        fontSize: 7,
        bold: true,
        color: '#0f172a',
        margin: [2, 1.5, 3, 1.5]
      },
      casillaNumTotal: {
        fontSize: 7,
        bold: true,
        color: '#ffffff',
        fillColor: '#065f46',
        margin: [1, 2, 1, 2]
      },
      casillaLabelTotal: {
        fontSize: 7,
        bold: true,
        color: '#065f46',
        fillColor: '#ecfdf5',
        margin: [3, 2, 2, 2]
      },
      casillaValTotal: {
        fontSize: 7.5,
        bold: true,
        color: '#065f46',
        fillColor: '#ecfdf5',
        margin: [2, 2, 3, 2]
      }
    },
    content: [
      // DIAN Official Form Banner with Corporate Logo
      {
        table: {
          widths: agentConfig.logoBase64 ? ['16%', '68%', '16%'] : ['18%', '64%', '18%'],
          body: [
            [
              agentConfig.logoBase64 ? {
                fillColor: '#ffffff',
                border: [true, true, false, true],
                borderColor: ['#047857', '#047857', '#047857', '#047857'],
                margin: [2, 2, 2, 2],
                alignment: 'center',
                image: agentConfig.logoBase64,
                width: 48
              } : {
                fillColor: '#065f46',
                border: [true, true, false, true],
                borderColor: ['#047857', '#047857', '#047857', '#047857'],
                margin: [4, 6, 4, 6],
                stack: [
                  { text: 'DIAN', fontSize: 13, bold: true, color: '#ffffff', alignment: 'center' },
                  { text: 'República de Colombia', fontSize: 6.5, color: '#a7f3d0', alignment: 'center' }
                ]
              },
              {
                fillColor: '#065f46',
                border: [false, true, false, true],
                borderColor: ['#047857', '#047857', '#047857', '#047857'],
                margin: [4, 4, 4, 4],
                stack: [
                  { text: 'Certificado de Ingresos y Retenciones por Rentas de Trabajo y de Pensiones', style: 'dianTitle' },
                  { text: 'Formulario Oficial 220 - Artículo 378 del Estatuto Tributario • Copropiedad Primavera Urbana', style: 'dianSubtitle', margin: [0, 2, 0, 0] }
                ]
              },
              {
                fillColor: '#047857',
                border: [false, true, true, true],
                borderColor: ['#047857', '#047857', '#047857', '#047857'],
                margin: [4, 4, 4, 4],
                stack: [
                  { text: '1. AÑO GRAVABLE', fontSize: 6, bold: true, color: '#d1fae5', alignment: 'center' },
                  { text: String(year), style: 'dianYear', margin: [0, 2, 0, 0] }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 4]
      },

      // Section: Retenedor (Entidad Informante)
      {
        table: {
          widths: ['25%', '8%', '67%'],
          body: [
            [
              {
                fillColor: '#f8fafc',
                margin: [4, 2, 4, 2],
                stack: [
                  { text: '5. NIT DEL RETENEDOR', style: 'fieldLabel' },
                  { text: agentConfig.nit || '800198245', style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [4, 2, 4, 2],
                stack: [
                  { text: '6. DV', style: 'fieldLabel' },
                  { text: agentConfig.dv || '3', style: 'fieldValue', alignment: 'center' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [4, 2, 4, 2],
                stack: [
                  { text: '11. APELLIDOS Y NOMBRES O RAZÓN SOCIAL DEL AGENTE RETENEDOR (COPROPIEDAD)', style: 'fieldLabel' },
                  { text: (agentConfig.razonSocial || 'CENTRO COMERCIAL PRIMAVERA P.H.').toUpperCase(), style: 'fieldValue' }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1'
        },
        margin: [0, 0, 0, 4]
      },

      // Section: Asalariado / Beneficiario
      {
        table: {
          widths: ['10%', '20%', '17%', '17%', '18%', '18%'],
          body: [
            [
              {
                fillColor: '#f8fafc',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: '24. TIPO DOC', style: 'fieldLabel' },
                  { text: tipoDoc, style: 'fieldValue', alignment: 'center' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: '25. IDENTIFICACIÓN', style: 'fieldLabel' },
                  { text: numId, style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: '26. PRIMER APELLIDO', style: 'fieldLabel' },
                  { text: pApellido, style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: '27. SEGUNDO APELLIDO', style: 'fieldLabel' },
                  { text: sApellido || '-', style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: '28. PRIMER NOMBRE', style: 'fieldLabel' },
                  { text: pNombre, style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#f8fafc',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: '29. OTROS NOMBRES', style: 'fieldLabel' },
                  { text: oNombre || '-', style: 'fieldValue' }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1'
        },
        margin: [0, 0, 0, 4]
      },

      // Section: Periodo y Ubicacion
      {
        table: {
          widths: ['40%', '25%', '35%'],
          body: [
            [
              {
                fillColor: '#ffffff',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: 'DIRECCIÓN DEL BENEFICIARIO', style: 'fieldLabel' },
                  { text: `${direccion} ${muni ? '• ' + muni : ''} ${dpto ? '• ' + dpto : ''}`, style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#ffffff',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: 'PERÍODO DE LA CERTIFICACIÓN', style: 'fieldLabel' },
                  { text: `01/01/${year} AL 31/12/${year}`, style: 'fieldValue' }
                ]
              },
              {
                fillColor: '#ffffff',
                margin: [3, 2, 3, 2],
                stack: [
                  { text: 'FECHA Y CIUDAD DE EXPEDICIÓN', style: 'fieldLabel' },
                  { text: expDate, style: 'fieldValue' }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1'
        },
        margin: [0, 0, 0, 4]
      },

      // Main Formulario 220 Casillas Table
      {
        table: {
          widths: ['5%', '73%', '22%'],
          body: tableRows
        },
        layout: {
          hLineWidth: (i) => (i === 0 || i === 1 ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1'
        },
        margin: [0, 0, 0, 6]
      },

      // Signatures and Legal Certification Box
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                margin: [6, 4, 6, 4],
                stack: signatureElements
              },
              {
                margin: [6, 12, 6, 4],
                stack: [
                  { text: '', margin: [0, 15, 0, 0] },
                  { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#334155' }], alignment: 'center', margin: [0, 3, 0, 3] },
                  { text: `${pNombre} ${sApellido ? sApellido + ' ' : ''}${pApellido}`, bold: true, fontSize: 8, alignment: 'center' },
                  { text: 'Firma del Trabajador o Empleado Beneficiario', fontSize: 7, color: '#64748b', alignment: 'center' },
                  { text: 'Certifico que los datos aquí declarados corresponden a mis ingresos de la vigencia.', fontSize: 6, color: '#94a3b8', alignment: 'center', margin: [0, 2, 0, 0] }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1'
        }
      }
    ]
  };

  return docDefinition;
}

module.exports = {
  buildFormulario220PdfDefinition
};
