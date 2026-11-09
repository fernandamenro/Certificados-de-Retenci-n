/**
 * Plantilla Oficial DIAN - Formulario 220 (Año Gravable 2024 / 2025 / 2026)
 * Réplica exacta del Formulario_220_2026 GUIA oficial de la DIAN.
 *
 * Certificado de ingresos y retenciones por rentas de trabajo y de pensiones.
 */

function formatNumber(val, isTotal = false) {
  if (val === null || val === undefined || val === '') {
    return isTotal ? '0' : '';
  }
  const num = typeof val === 'number' ? Math.round(val) : Math.round(parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0);
  if (num === 0) return isTotal ? '0' : '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toUpperCase();
}

/**
 * Helper to retrieve field values looking for exact names or common variations
 */
function getFieldValue(fields, ...keys) {
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null && fields[k] !== '') {
      const v = fields[k];
      return typeof v === 'number' ? v : (parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0);
    }
  }
  // Loose matching by stripping accents and non-alphanumerics
  const normKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const [fKey, fVal] of Object.entries(fields)) {
    const normFKey = fKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKeys.some(nk => normFKey === nk || normFKey.includes(nk) || nk.includes(normFKey))) {
      return typeof fVal === 'number' ? fVal : (parseFloat(String(fVal).replace(/[^0-9.-]/g, '')) || 0);
    }
  }
  return 0;
}

/**
 * Extracts and formats date to 'AAAA   MM   DD'
 */
function parseDateToYMD(dateStr, defaultYear) {
  if (!dateStr) {
    return `${defaultYear + 1}   03   15`;
  }
  const months = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };

  const lower = String(dateStr).toLowerCase();
  let day = '15', month = '03', yr = String(defaultYear + 1);

  for (const [mName, mNum] of Object.entries(months)) {
    if (lower.includes(mName)) {
      month = mNum;
      break;
    }
  }

  const dMatch = lower.match(/\b([0-2]?[0-9]|3[01])\b/);
  if (dMatch) {
    day = dMatch[1].padStart(2, '0');
  }

  const yMatch = lower.match(/\b(20[2-3][0-9])\b/);
  if (yMatch) {
    yr = yMatch[1];
  }

  return `${yr}   ${month}   ${day}`;
}

/**
 * Builds the official DIAN replica of Formulario 220
 */
function buildFormulario220PdfDefinition(agentConfig, record, issuanceDate) {
  const fields = record.fields || {};
  const year = record.ano || new Date().getFullYear() - 1;

  // Agent Withholding Info
  const agentNit = agentConfig.nit || '901003351';
  const agentDv = agentConfig.dv || '2';
  const agentRazonSocial = cleanStr(agentConfig.razonSocial || 'PRIMAVERA URBANA CENTRO COMERCIAL Y EMPRESARIAL');
  const agentCiudad = cleanStr(agentConfig.ciudad || 'VILLAVICENCIO');

  // Employee Info
  const tipoDoc = cleanStr(fields['Tipo de documento'] || 'CC');
  const numId = cleanStr(fields['Número de identificación del beneficiario'] || record.nit || '');
  const pApellido = cleanStr(fields['Primer apellido'] || record.primerApellido || '');
  const sApellido = cleanStr(fields['Segundo apellido'] || record.segundoApellido || '');
  const pNombre = cleanStr(fields['Primer nombre'] || record.primerNombre || '');
  const oNombre = cleanStr(fields['Otros nombres'] || record.otrosNombres || '');

  // Dates & Location
  const dateFrom = `${year}   01   01`;
  const dateTo = `${year}   12   31`;
  const expDateFormatted = parseDateToYMD(issuanceDate, year);

  // Concepto de los Ingresos (Casillas 36 a 51)
  const val36 = getFieldValue(fields, 'Pagos por salarios');
  const val37 = getFieldValue(fields, 'Pagos realizados con bonos electrónicos o de papel de servicio, cheques, tarjetas, vales, etc.');
  const val38 = getFieldValue(fields, 'Valor del exceso de los pagos por alimentación mayores a 41 UVT, art.387-1 E.T.', 'Valor del exceso de los pagos por alimentación mayores a 41 UVT, art. 387-1 E.T.');
  const val39 = getFieldValue(fields, 'Pagos por honorarios');
  const val40 = getFieldValue(fields, 'Pagos por servicios');
  const val41 = getFieldValue(fields, 'Pagos por comisiones');
  const val42 = getFieldValue(fields, 'Pagos por prestaciones sociales');
  const val43 = getFieldValue(fields, 'Pagos por viáticos');
  const val44 = getFieldValue(fields, 'Pagos por gastos de representación');
  const val45 = getFieldValue(fields, 'Pagos por compensaciones de trabajo asociado cooperativo', 'Pagos por compensaciones por el trabajo asociado cooperativo');
  const val46 = getFieldValue(fields, 'Otros pagos');
  const val47 = getFieldValue(fields, 'Cesantías e intereses de cesantías efectivamente pagadas al empleado.', 'Auxilio de cesantía e intereses efectivamente pagados al empleado');
  const val48 = getFieldValue(fields, 'Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo, Capítulo VII, Título VIII Parte Primera', 'Auxilio de cesantía reconocido a trabajadores del régimen tradicional del CST, contenido en el Capítulo VII, Título VIII Parte Primera');
  const val49 = getFieldValue(fields, 'Cesantías consignadas al fondo de cesantías.', 'Auxilio de cesantía consignado al fondo de cesantías');
  const val50 = getFieldValue(fields, 'Pensiones de jubilación, vejez o invalidez');
  const val51 = getFieldValue(fields, 'Valor apoyos económicos no reembolsables o condonados, entregados por el Estado o financiados con recursos públicos, para financiar programas educativos', 'Apoyos económicos educativos financiados con recursos públicos, no reembolsables o condonados');

  // Casilla 52 Total Ingresos Brutos (Suma 36 a 51)
  const calculatedTotalIngresos = val36 + val37 + val38 + val39 + val40 + val41 + val42 + val43 + val44 + val45 + val46 + val47 + val48 + val49 + val50 + val51;
  const storedTotalIngresos = getFieldValue(fields, 'Total, Ingresos brutos de rentas de trabajo y pensión', 'Total de ingresos brutos (Sume 36 a 51)');
  const val52 = storedTotalIngresos > 0 ? storedTotalIngresos : calculatedTotalIngresos;

  // Concepto de los Aportes (Casillas 53 a 60)
  const val53 = getFieldValue(fields, 'Aportes Obligatorios por Salud a cargo del trabajador', 'Aportes obligatorios por salud a cargo del trabajador');
  const val54 = getFieldValue(fields, 'Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador');
  const val55 = getFieldValue(fields, 'Aportes voluntarios al régimen de ahorro individual con solidaridad – RAIS', 'Cotizaciones voluntarias al régimen de ahorro individual con solidaridad - RAIS');
  const val56 = getFieldValue(fields, 'Aportes voluntarios a fondos de pensiones voluntarias', 'Aportes voluntarios a fondos de pensiones');
  const val57 = getFieldValue(fields, 'Aportes a cuentas AFC');
  const val58 = getFieldValue(fields, 'Aportes a cuentas AVC');
  const val59 = getFieldValue(fields, 'Valor ingreso laboral promedio de los últimos seis meses', 'Ingreso laboral promedio de los últimos seis meses anteriores (numeral 4 art. 206 E.T.)');
  const val60 = getFieldValue(fields, 'Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones', 'Valor de la retención en la fuente por ingresos laborales y de pensiones');

  // Datos a cargo del trabajador o pensionado (Casillas 61 a 75)
  const val61 = getFieldValue(fields, 'Arrendamientos recibido', 'Arrendamientos');
  const val68 = getFieldValue(fields, 'Arrendamientos retenido');
  const val62 = getFieldValue(fields, 'Honorarios recibido', 'Honorarios, comisiones y servicios recibido');
  const val69 = getFieldValue(fields, 'Honorarios retenido');
  const val63 = getFieldValue(fields, 'Intereses recibido', 'Intereses y rendimientos financieros recibido');
  const val70 = getFieldValue(fields, 'Intereses retenido');
  const val64 = getFieldValue(fields, 'Enajenación recibido', 'Enajenación de activos fijos recibido');
  const val71 = getFieldValue(fields, 'Enajenación retenido');
  const val65 = getFieldValue(fields, 'Loterías recibido', 'Loterías, rifas, apuestas y similares recibido');
  const val72 = getFieldValue(fields, 'Loterías retenido');
  const val66 = getFieldValue(fields, 'Otros ingresos recibido', 'Otros recibido');
  const val73 = getFieldValue(fields, 'Otros retenido');

  const val67 = val61 + val62 + val63 + val64 + val65 + val66;
  const val74 = val68 + val69 + val70 + val71 + val72 + val73;
  const val75 = val60 + val74;

  // Dependiente Económico (Casillas 79 a 82)
  const depTipoDoc = cleanStr(fields['Tipo de documento del dependiente económico'] || '');
  const depNumDoc = cleanStr(fields['Número de Identificación del dependiente económico'] || '');
  const depNombres = cleanStr(fields['Apellidos y Nombres del dependiente económico'] || fields['Nombre del dependiente económico'] || '');
  const depParentesco = cleanStr(fields['Parentesco del dependiente económico'] || '');

  // Helper for 3-column rows (Income and Aportes)
  function makeGridRow(label, casillaNum, val, isBold = false) {
    return [
      {
        text: label,
        style: isBold ? 'cellLabelBold' : 'cellLabel',
        margin: [2, 0.4, 2, 0.4]
      },
      {
        text: String(casillaNum),
        style: isBold ? 'cellCasillaNumBold' : 'cellCasillaNum',
        alignment: 'center',
        margin: [0, 0.4, 0, 0.4]
      },
      {
        text: formatNumber(val, isBold),
        style: isBold ? 'cellValBold' : 'cellVal',
        alignment: 'right',
        margin: [2, 0.4, 2, 0.4]
      }
    ];
  }

  // Helper for 5-column rows (Otros ingresos)
  function makeOtrosIngresosRow(label, casRec, valRec, casRet, valRet, isBold = false) {
    return [
      {
        text: label,
        style: isBold ? 'cellLabelBold' : 'cellLabel',
        margin: [2, 0.4, 2, 0.4]
      },
      {
        text: String(casRec),
        style: isBold ? 'cellCasillaNumBold' : 'cellCasillaNum',
        alignment: 'center',
        margin: [0, 0.4, 0, 0.4]
      },
      {
        text: formatNumber(valRec, isBold),
        style: isBold ? 'cellValBold' : 'cellVal',
        alignment: 'right',
        margin: [2, 0.4, 2, 0.4]
      },
      {
        text: String(casRet),
        style: isBold ? 'cellCasillaNumBold' : 'cellCasillaNum',
        alignment: 'center',
        margin: [0, 0.4, 0, 0.4]
      },
      {
        text: formatNumber(valRet, isBold),
        style: isBold ? 'cellValBold' : 'cellVal',
        alignment: 'right',
        margin: [2, 0.4, 2, 0.4]
      }
    ];
  }

  const compactTableLayout = {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#475569',
    vLineColor: () => '#475569',
    paddingTop: () => 0.35,
    paddingBottom: () => 0.35,
    paddingLeft: () => 1.5,
    paddingRight: () => 1.5
  };

  const docDefinition = {
    pageSize: 'LETTER',
    pageOrientation: 'portrait',
    pageMargins: [16, 10, 16, 8],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 5.6,
      color: '#0F172A',
      lineHeight: 1.02
    },
    styles: {
      headerTitle: {
        fontSize: 9,
        bold: true,
        color: '#0F172A',
        alignment: 'center'
      },
      boxLabel: {
        fontSize: 4.6,
        color: '#334155',
        bold: false
      },
      boxVal: {
        fontSize: 6.2,
        bold: true,
        color: '#0F172A'
      },
      boxValBold: {
        fontSize: 6.6,
        bold: true,
        color: '#0F172A'
      },
      sectionHeader: {
        fontSize: 5.8,
        bold: true,
        color: '#0F172A',
        fillColor: '#EBF2F7'
      },
      cellLabel: {
        fontSize: 5.2,
        color: '#1E293B'
      },
      cellLabelBold: {
        fontSize: 5.5,
        bold: true,
        color: '#0F172A'
      },
      cellCasillaNum: {
        fontSize: 5.2,
        bold: true,
        color: '#334155',
        fillColor: '#F8FAFC'
      },
      cellCasillaNumBold: {
        fontSize: 5.5,
        bold: true,
        color: '#0F172A',
        fillColor: '#E2E8F0'
      },
      cellVal: {
        fontSize: 6.2,
        bold: false,
        color: '#0F172A'
      },
      cellValBold: {
        fontSize: 6.5,
        bold: true,
        color: '#0F172A'
      }
    },
    content: [
      // 1. BANNER SUPERIOR OFICIAL (DIAN, TÍTULO, AÑO, BLOQUE 220)
      {
        table: {
          widths: ['18%', '68%', '14%'],
          body: [
            [
              // DIAN Logo
              {
                stack: [
                  { text: 'DIAN', fontSize: 20, bold: true, color: '#1B365D', characterSpacing: 1.2, margin: [0, 2, 0, 0] },
                  { canvas: [{ type: 'line', x1: 0, y1: 1, x2: 56, y2: 1, lineWidth: 1.5, lineColor: '#2B6CB0' }] }
                ],
                alignment: 'center'
              },
              // Título y Año Gravable
              {
                stack: [
                  {
                    text: 'Certificado de ingresos y retenciones por rentas de trabajo y de pensiones',
                    style: 'headerTitle',
                    margin: [0, 1, 0, 1]
                  },
                  {
                    columns: [
                      { width: '*', text: '' },
                      { width: 'auto', text: 'Año gravable', fontSize: 8, bold: true, margin: [0, 1, 5, 0] },
                      {
                        width: 42,
                        table: {
                          widths: [36],
                          body: [[{ text: String(year), fontSize: 8, bold: true, alignment: 'center', fillColor: '#F8FAFC', margin: [0, 0.5, 0, 0.5] }]]
                        },
                        layout: compactTableLayout
                      },
                      { width: '*', text: '' }
                    ]
                  }
                ],
                alignment: 'center'
              },
              // Bloque Azul 220
              {
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        text: '220',
                        fontSize: 22,
                        bold: true,
                        color: '#FFFFFF',
                        fillColor: '#2B6CB0',
                        alignment: 'center',
                        margin: [0, 2, 0, 2]
                      }
                    ]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 1]
      },

      // 2. SUB-BARRA: INSTRUCCIONES Y CASILLA 4 (NÚMERO DE FORMULARIO)
      {
        table: {
          widths: ['65%', '35%'],
          body: [
            [
              {
                text: 'Antes de diligenciar este formulario lea cuidadosamente las instrucciones',
                fontSize: 5,
                italics: true,
                color: '#475569',
                margin: [2, 0.5, 2, 0.5]
              },
              {
                text: '4. Número de formulario',
                fontSize: 5,
                bold: true,
                color: '#1E293B',
                margin: [2, 0.5, 2, 0.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 3. SECCIÓN RETENEDOR (CASILLAS 5 A 11)
      {
        table: {
          widths: ['3%', '23%', '5%', '17.25%', '17.25%', '17.25%', '17.25%'],
          body: [
            [
              {
                rowSpan: 2,
                text: 'R\ne\nt\ne\nn\ne\nd\no\nr',
                fontSize: 4.5,
                bold: true,
                alignment: 'center',
                fillColor: '#EBF2F7',
                margin: [0, 1, 0, 0]
              },
              {
                stack: [
                  { text: '5. Número de Identificación Tributaria (NIT)', style: 'boxLabel' },
                  { text: agentNit, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '6. DV.', style: 'boxLabel', alignment: 'center' },
                  { text: agentDv, style: 'boxValBold', alignment: 'center', margin: [0, 0.5, 0, 0] }
                ],
                margin: [0.5, 0.5, 0.5, 0.5]
              },
              {
                stack: [
                  { text: '7. Primer apellido', style: 'boxLabel' },
                  { text: '', style: 'boxVal' }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '8. Segundo apellido', style: 'boxLabel' },
                  { text: '', style: 'boxVal' }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '9. Primer nombre', style: 'boxLabel' },
                  { text: '', style: 'boxVal' }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '10. Otros nombres', style: 'boxLabel' },
                  { text: '', style: 'boxVal' }
                ],
                margin: [1, 0.5, 1, 0.5]
              }
            ],
            [
              {},
              {
                colSpan: 6,
                stack: [
                  { text: '11. Razón social', style: 'boxLabel' },
                  { text: agentRazonSocial, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {}, {}, {}, {}, {}
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 4. SECCIÓN EMPLEADO (CASILLAS 24 A 29)
      {
        table: {
          widths: ['3%', '10%', '18%', '17.25%', '17.25%', '17.25%', '17.25%'],
          body: [
            [
              {
                text: 'E\nm\np\nl\ne\na\nd\no',
                fontSize: 4.5,
                bold: true,
                alignment: 'center',
                fillColor: '#EBF2F7',
                margin: [0, 0.5, 0, 0]
              },
              {
                stack: [
                  { text: '24. Tipo doc.', style: 'boxLabel', alignment: 'center' },
                  { text: tipoDoc, style: 'boxValBold', alignment: 'center', margin: [0, 0.5, 0, 0] }
                ],
                margin: [0.5, 0.5, 0.5, 0.5]
              },
              {
                stack: [
                  { text: '25. Número de Identificación', style: 'boxLabel' },
                  { text: numId, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '26. Primer apellido', style: 'boxLabel' },
                  { text: pApellido, style: 'boxVal', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '27. Segundo apellido', style: 'boxLabel' },
                  { text: sApellido, style: 'boxVal', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '28. Primer nombre', style: 'boxLabel' },
                  { text: pNombre, style: 'boxVal', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '29. Otros nombres', style: 'boxLabel' },
                  { text: oNombre, style: 'boxVal', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 5. PERÍODO DE LA CERTIFICACIÓN Y LUGAR (CASILLAS 30 A 35)
      {
        table: {
          widths: ['17%', '17%', '20%', '28%', '9%', '9%'],
          body: [
            [
              {
                colSpan: 2,
                text: 'Período de la certificación',
                fontSize: 4.8,
                bold: true,
                alignment: 'center',
                fillColor: '#F8FAFC',
                margin: [0, 0.3, 0, 0.3]
              },
              {},
              {
                rowSpan: 2,
                stack: [
                  { text: '32. Fecha de expedición', style: 'boxLabel', alignment: 'center' },
                  { text: 'AAAA   MM   DD', fontSize: 4.2, color: '#94A3B8', alignment: 'center' },
                  { text: expDateFormatted, style: 'boxValBold', alignment: 'center', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                rowSpan: 2,
                stack: [
                  { text: '33. Lugar donde se practicó la retención', style: 'boxLabel' },
                  { text: agentCiudad, style: 'boxValBold', margin: [0, 1.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                rowSpan: 2,
                stack: [
                  { text: '34. Cód. Dpto.', style: 'boxLabel', alignment: 'center' },
                  { text: '50', style: 'boxValBold', alignment: 'center', margin: [0, 1.5, 0, 0] }
                ],
                margin: [0.5, 0.5, 0.5, 0.5]
              },
              {
                rowSpan: 2,
                stack: [
                  { text: '35. Cód. Cdad/Mun', style: 'boxLabel', alignment: 'center' },
                  { text: '001', style: 'boxValBold', alignment: 'center', margin: [0, 1.5, 0, 0] }
                ],
                margin: [0.5, 0.5, 0.5, 0.5]
              }
            ],
            [
              {
                stack: [
                  { text: '30. DE:   AAAA  MM  DD', style: 'boxLabel' },
                  { text: dateFrom, style: 'boxValBold', alignment: 'center', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '31. A:     AAAA  MM  DD', style: 'boxLabel' },
                  { text: dateTo, style: 'boxValBold', alignment: 'center', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {}, {}, {}, {}
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 6. CONCEPTO DE LOS INGRESOS (CASILLAS 36 A 52)
      {
        table: {
          widths: ['80%', '4.5%', '15.5%'],
          body: [
            [
              { text: 'Concepto de los Ingresos', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              { text: '', style: 'sectionHeader' },
              { text: 'Valor', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] }
            ],
            makeGridRow('Pagos por salarios', 36, val36),
            makeGridRow('Pagos realizados con bonos electrónicos o de papel de servicio, cheques, tarjetas, vales, etc.', 37, val37),
            makeGridRow('Valor del exceso de los pagos por alimentación mayores a 41 UVT, art. 387-1 E.T.', 38, val38),
            makeGridRow('Pagos por honorarios', 39, val39),
            makeGridRow('Pagos por servicios', 40, val40),
            makeGridRow('Pagos por comisiones', 41, val41),
            makeGridRow('Pagos por prestaciones sociales', 42, val42),
            makeGridRow('Pagos por viáticos', 43, val43),
            makeGridRow('Pagos por gastos de representación', 44, val44),
            makeGridRow('Pagos por compensaciones por el trabajo asociado cooperativo', 45, val45),
            makeGridRow('Otros pagos', 46, val46),
            makeGridRow('Auxilio de cesantía e intereses efectivamente pagados al empleado', 47, val47),
            makeGridRow('Auxilio de cesantía reconocido a trabajadores del régimen tradicional del CST, contenido en el Capítulo VII, Título VIII Parte Primera', 48, val48),
            makeGridRow('Auxilio de cesantía consignado al fondo de cesantías', 49, val49),
            makeGridRow('Pensiones de jubilación, vejez o invalidez', 50, val50),
            makeGridRow('Apoyos económicos educativos financiados con recursos públicos, no reembolsables o condonados', 51, val51),
            makeGridRow('Total de ingresos brutos (Sume 36 a 51)', 52, val52, true)
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 7. CONCEPTO DE LOS APORTES (CASILLAS 53 A 60)
      {
        table: {
          widths: ['80%', '4.5%', '15.5%'],
          body: [
            [
              { text: 'Concepto de los aportes', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              { text: '', style: 'sectionHeader' },
              { text: 'Valor', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] }
            ],
            makeGridRow('Aportes obligatorios por salud a cargo del trabajador', 53, val53),
            makeGridRow('Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador', 54, val54),
            makeGridRow('Cotizaciones voluntarias al régimen de ahorro individual con solidaridad - RAIS', 55, val55),
            makeGridRow('Aportes voluntarios a fondos de pensiones', 56, val56),
            makeGridRow('Aportes a cuentas AFC', 57, val57),
            makeGridRow('Aportes a cuentas AVC', 58, val58),
            makeGridRow('Ingreso laboral promedio de los últimos seis meses anteriores (numeral 4 art. 206 E.T.)', 59, val59),
            makeGridRow('Valor de la retención en la fuente por ingresos laborales y de pensiones', 60, val60, true)
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 8. FILA: NOMBRE DEL PAGADOR O AGENTE RETENEDOR
      {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  { text: 'Nombre del pagador o agente retenedor', style: 'boxLabel' },
                  { text: agentRazonSocial, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1.5, 0.5, 1.5, 0.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 9. SECCIÓN: DATOS A CARGO DEL TRABAJADOR O PENSIONADO (CASILLAS 61 A 75)
      {
        table: {
          widths: ['54%', '4.5%', '18.25%', '4.5%', '18.75%'],
          body: [
            [
              { colSpan: 5, text: 'Datos a cargo del trabajador o pensionado', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              {}, {}, {}, {}
            ],
            [
              { text: 'Concepto de otros ingresos', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              { text: '', style: 'sectionHeader' },
              { text: 'Valor recibido', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              { text: '', style: 'sectionHeader' },
              { text: 'Valor retenido', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] }
            ],
            makeOtrosIngresosRow('Arrendamientos', 61, val61, 68, val68),
            makeOtrosIngresosRow('Honorarios, comisiones y servicios', 62, val62, 69, val69),
            makeOtrosIngresosRow('Intereses y rendimientos financieros', 63, val63, 70, val70),
            makeOtrosIngresosRow('Enajenación de activos fijos', 64, val64, 71, val71),
            makeOtrosIngresosRow('Loterías, rifas, apuestas y similares', 65, val65, 72, val72),
            makeOtrosIngresosRow('Otros', 66, val66, 73, val73),
            makeOtrosIngresosRow('Totales: (Valor recibido: Sume 61 a 66), (Valor retenido: Sume 68 a 73)', 67, val67, 74, val74, true),
            [
              {
                colSpan: 3,
                text: 'Total retenciones año gravable (Sume 60 + 74)',
                style: 'cellLabelBold',
                margin: [1.5, 0.5, 1.5, 0.5]
              },
              {}, {},
              {
                text: '75',
                style: 'cellCasillaNumBold',
                alignment: 'center',
                margin: [0, 0.5, 0, 0.5]
              },
              {
                text: formatNumber(val75, true),
                style: 'cellValBold',
                alignment: 'right',
                margin: [1.5, 0.5, 1.5, 0.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 10. IDENTIFICACIÓN DE BIENES POSEÍDOS Y DEUDAS (CASILLAS 76 A 78)
      {
        table: {
          widths: ['4%', '77.5%', '18.5%'],
          body: [
            [
              { text: 'Item', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              { text: '76. Identificación de los bienes poseídos', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] },
              { text: '77. Valor patrimonial', style: 'sectionHeader', alignment: 'center', margin: [0, 0.5, 0, 0.5] }
            ],
            [
              { text: '1', style: 'cellCasillaNum', alignment: 'center', margin: [0, 0.4, 0, 0.4] },
              { text: '', style: 'cellVal' },
              { text: '', style: 'cellVal' }
            ],
            [
              { text: '2', style: 'cellCasillaNum', alignment: 'center', margin: [0, 0.4, 0, 0.4] },
              { text: '', style: 'cellVal' },
              { text: '', style: 'cellVal' }
            ],
            [
              { text: '3', style: 'cellCasillaNum', alignment: 'center', margin: [0, 0.4, 0, 0.4] },
              { text: '', style: 'cellVal' },
              { text: '', style: 'cellVal' }
            ],
            [
              {
                colSpan: 2,
                text: 'Deudas vigentes a 31 de diciembre',
                style: 'cellLabelBold',
                margin: [1.5, 0.5, 1.5, 0.5]
              },
              {},
              {
                columns: [
                  { text: '78', style: 'cellCasillaNumBold', width: 16, alignment: 'center' },
                  { text: '', style: 'cellVal', width: '*' }
                ],
                margin: [0.5, 0.5, 0.5, 0.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 11. IDENTIFICACIÓN DEL DEPENDIENTE ECONÓMICO (CASILLAS 79 A 82)
      {
        table: {
          widths: ['15%', '22%', '45%', '18%'],
          body: [
            [
              {
                colSpan: 4,
                text: 'Identificación del dependiente económico de acuerdo al parágrafo 2 del artículo 387 del Estatuto Tributario',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 0.5, 0, 0.5]
              },
              {}, {}, {}
            ],
            [
              {
                stack: [
                  { text: '79. Tipo documento', style: 'boxLabel', alignment: 'center' },
                  { text: depTipoDoc, style: 'boxValBold', alignment: 'center', margin: [0, 0.5, 0, 0] }
                ],
                margin: [0.5, 0.5, 0.5, 0.5]
              },
              {
                stack: [
                  { text: '80. No. Documento', style: 'boxLabel' },
                  { text: depNumDoc, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '81. Apellidos y Nombres', style: 'boxLabel' },
                  { text: depNombres, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              },
              {
                stack: [
                  { text: '82. Parentesco', style: 'boxLabel' },
                  { text: depParentesco, style: 'boxValBold', margin: [0, 0.5, 0, 0] }
                ],
                margin: [1, 0.5, 1, 0.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 0]
      },

      // 12. DECLARACIÓN DEL TRABAJADOR Y FIRMA
      {
        table: {
          widths: ['70%', '30%'],
          body: [
            [
              {
                stack: [
                  { text: 'Certifico que durante el año gravable:', fontSize: 4.8, bold: true, color: '#0F172A', margin: [0, 0, 0, 0.5] },
                  { text: '1. Mi patrimonio bruto no excedió de 4.500 UVT.', fontSize: 4.4, color: '#334155' },
                  { text: '2. Mis ingresos brutos fueron inferiores a 1.400 UVT.', fontSize: 4.4, color: '#334155' },
                  { text: '3. No fui responsable del impuesto sobre las ventas a 31 de diciembre del año gravable.', fontSize: 4.4, color: '#334155' },
                  { text: '4. Mis consumos mediante tarjeta de crédito no excedieron la suma de 1.400 UVT.', fontSize: 4.4, color: '#334155' },
                  { text: '5. Que el total de mis compras y consumos no superó la suma de 1.400 UVT.', fontSize: 4.4, color: '#334155' },
                  { text: '6. Que el valor total de mis consignaciones bancarias, depósitos o inversiones financieras no excedió los 1.400 UVT.', fontSize: 4.4, color: '#334155' },
                  { text: 'Por lo tanto, manifiesto que no estoy obligado a presentar declaración de renta y complementario por el año gravable.', fontSize: 4.4, bold: true, color: '#0F172A', margin: [0, 0.5, 0, 0] }
                ],
                margin: [2, 1.5, 2, 1.5]
              },
              {
                stack: [
                  { text: '', margin: [0, 16, 0, 0] },
                  { canvas: [{ type: 'line', x1: 5, y1: 0, x2: 155, y2: 0, lineWidth: 0.5, lineColor: '#334155' }] },
                  { text: 'Firma del Trabajador o Pensionado', fontSize: 5.2, alignment: 'center', color: '#1E293B', margin: [0, 1.5, 0, 0] }
                ],
                margin: [2, 1.5, 2, 1.5]
              }
            ]
          ]
        },
        layout: compactTableLayout,
        margin: [0, 0, 0, 1]
      },

      // 13. NOTA LEGAL AL PIE
      {
        text: 'Nota: este certificado sustituye para todos los efectos legales la declaración de Renta y Complementario para el trabajador o pensionado que cumpla con lo establecido en el artículo 1.6.1.13.2.7. del Decreto 1625 de 2016 Único reglamentario en materia tributaria. Para aquellos trabajadores independientes contribuyentes del impuesto unificado deberán presentar la declaración anual consolidada del Régimen Simple de Tributación (SIMPLE).',
        fontSize: 4.3,
        color: '#475569',
        alignment: 'justify',
        margin: [0, 0.5, 0, 0]
      }
    ]
  };

  return docDefinition;
}

module.exports = {
  buildFormulario220PdfDefinition
};
