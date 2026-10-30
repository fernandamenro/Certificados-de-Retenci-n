const xlsx = require('xlsx');
const { EXPECTED_RETENCIONES_COLUMNS, EXPECTED_FORMULARIO_220_COLUMNS } = require('./excelParser');

/**
 * Generates an Excel buffer for Retenciones Tributarias template
 */
function generateRetencionesTemplateBuffer() {
  const sampleData = [
    {
      'NIT': '900456789',
      'TIPO DE CERTIFICADO': 'RENTA',
      'CUENTA': '236515',
      'NOMBRE': 'SERVICIOS DE VIGILANCIA Y SEGURIDAD LTDA',
      'DESCRIPCION': 'Servicios de Vigilancia y Aseo 2%',
      'AÑO': 2024,
      'BASE': 15800000,
      'VALOR': 316000
    },
    {
      'NIT': '900456789',
      'TIPO DE CERTIFICADO': 'RENTA',
      'CUENTA': '236525',
      'NOMBRE': 'SERVICIOS DE VIGILANCIA Y SEGURIDAD LTDA',
      'DESCRIPCION': 'Honorarios Mantenimiento Circuito Cerrado 11%',
      'AÑO': 2024,
      'BASE': 4500000,
      'VALOR': 495000
    },
    {
      'NIT': '900456789',
      'TIPO DE CERTIFICADO': 'IVA',
      'CUENTA': '236701',
      'NOMBRE': 'SERVICIOS DE VIGILANCIA Y SEGURIDAD LTDA',
      'DESCRIPCION': 'Retención IVA Servicios 15%',
      'AÑO': 2024,
      'BASE': 3002000,
      'VALOR': 450300
    },
    {
      'NIT': '900456789',
      'TIPO DE CERTIFICADO': 'ICA',
      'CUENTA': '236801',
      'NOMBRE': 'SERVICIOS DE VIGILANCIA Y SEGURIDAD LTDA',
      'DESCRIPCION': 'Retención ICA Actividades de Seguridad 9.66 por mil',
      'AÑO': 2024,
      'BASE': 20300000,
      'VALOR': 196098
    },
    {
      'NIT': '860123987',
      'TIPO DE CERTIFICADO': 'RENTA',
      'CUENTA': '236540',
      'NOMBRE': 'ASESORES JURIDICOS & ASOCIADOS S.A.S.',
      'DESCRIPCION': 'Honorarios Profesionales Personas Jurídicas 11%',
      'AÑO': 2024,
      'BASE': 12000000,
      'VALOR': 1320000
    },
    {
      'NIT': '79845123',
      'TIPO DE CERTIFICADO': 'RENTA',
      'CUENTA': '236520',
      'NOMBRE': 'JUAN CARLOS MARTINEZ ROJAS',
      'DESCRIPCION': 'Servicios Técnicos Electricidad 4%',
      'AÑO': 2024,
      'BASE': 3200000,
      'VALOR': 128000
    }
  ];

  const worksheet = xlsx.utils.json_to_sheet(sampleData, { header: EXPECTED_RETENCIONES_COLUMNS });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // NIT
    { wch: 22 }, // TIPO
    { wch: 12 }, // CUENTA
    { wch: 42 }, // NOMBRE
    { wch: 45 }, // DESCRIPCION
    { wch: 10 }, // AÑO
    { wch: 18 }, // BASE
    { wch: 18 }  // VALOR
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Retenciones');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generates an Excel buffer for Formulario 220 (Empleados) template
 */
function generateFormulario220TemplateBuffer() {
  const sampleEmployee1 = {};
  EXPECTED_FORMULARIO_220_COLUMNS.forEach(col => {
    sampleEmployee1[col] = 0;
  });

  sampleEmployee1['Entidad Informante'] = 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA';
  sampleEmployee1['Tipo de documento'] = 'CC';
  sampleEmployee1['Número de identificación del beneficiario'] = '1018456789';
  sampleEmployee1['Primer apellido'] = 'RAMIREZ';
  sampleEmployee1['Segundo apellido'] = 'SUAREZ';
  sampleEmployee1['Primer nombre'] = 'ANDREA';
  sampleEmployee1['Otros nombres'] = 'CAROLINA';
  sampleEmployee1['Dirección del beneficiario'] = 'Carrera 7 # 120 - 45 Apto 302';
  sampleEmployee1['Departamento del beneficiario'] = 'Meta';
  sampleEmployee1['Municipio del beneficiario'] = 'Villavicencio';
  sampleEmployee1['País del beneficiario'] = 'Colombia';
  sampleEmployee1['Pagos por salarios'] = 45600000;
  sampleEmployee1['Pagos por prestaciones sociales'] = 7600000;
  sampleEmployee1['Cesantías e intereses de cesantías efectivamente pagadas al empleado.'] = 456000;
  sampleEmployee1['Cesantías consignadas al fondo de cesantías.'] = 3800000;
  sampleEmployee1['Total, Ingresos brutos de rentas de trabajo y pensión'] = 57416000;
  sampleEmployee1['Aportes Obligatorios por Salud a cargo del trabajador'] = 1824000;
  sampleEmployee1['Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador'] = 1824000;
  sampleEmployee1['Aportes voluntarios a fondos de pensiones voluntarias'] = 1200000;
  sampleEmployee1['Aportes a cuentas AFC'] = 600000;
  sampleEmployee1['Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones'] = 1450000;
  sampleEmployee1['Valor ingreso laboral promedio de los últimos seis meses'] = 3800000;
  sampleEmployee1['Tipo de documento del dependiente económico'] = 'TI';
  sampleEmployee1['Número de Identificación del dependiente económico'] = '1122334455';

  const sampleEmployee2 = {};
  EXPECTED_FORMULARIO_220_COLUMNS.forEach(col => {
    sampleEmployee2[col] = 0;
  });
  sampleEmployee2['Entidad Informante'] = 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA';
  sampleEmployee2['Tipo de documento'] = 'CC';
  sampleEmployee2['Número de identificación del beneficiario'] = '80123456';
  sampleEmployee2['Primer apellido'] = 'LOPEZ';
  sampleEmployee2['Segundo apellido'] = 'CASTRO';
  sampleEmployee2['Primer nombre'] = 'FERNANDO';
  sampleEmployee2['Otros nombres'] = '';
  sampleEmployee2['Dirección del beneficiario'] = 'Calle 15 # 40 - 01';
  sampleEmployee2['Departamento del beneficiario'] = 'Meta';
  sampleEmployee2['Municipio del beneficiario'] = 'Villavicencio';
  sampleEmployee2['País del beneficiario'] = 'Colombia';
  sampleEmployee2['Pagos por salarios'] = 32400000;
  sampleEmployee2['Pagos por prestaciones sociales'] = 5400000;
  sampleEmployee2['Cesantías consignadas al fondo de cesantías.'] = 2700000;
  sampleEmployee2['Total, Ingresos brutos de rentas de trabajo y pensión'] = 40500000;
  sampleEmployee2['Aportes Obligatorios por Salud a cargo del trabajador'] = 1296000;
  sampleEmployee2['Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador'] = 1296000;
  sampleEmployee2['Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones'] = 320000;
  sampleEmployee2['Valor ingreso laboral promedio de los últimos seis meses'] = 2700000;

  const worksheet = xlsx.utils.json_to_sheet([sampleEmployee1, sampleEmployee2], {
    header: EXPECTED_FORMULARIO_220_COLUMNS
  });

  // Dynamic widths for 42 columns
  worksheet['!cols'] = EXPECTED_FORMULARIO_220_COLUMNS.map(col => ({
    wch: Math.max(col.length + 3, 16)
  }));

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Formulario 220');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generates an Excel buffer for Maestro de Terceros (Proveedores y Empleados con Correo OTP)
 */
function generateMaestroTercerosTemplateBuffer() {
  const sampleData = [
    {
      'NIT': '900456789',
      'Razón Social / Nombre': 'SERVICIOS DE VIGILANCIA Y SEGURIDAD PRIVADA LTDA',
      'Correo Electrónico': 'notificaciones@vigilanciaprivada.com',
      'Tipo de Tercero': 'Proveedor'
    },
    {
      'NIT': '860123987',
      'Razón Social / Nombre': 'ASESORES JURIDICOS & ASOCIADOS S.A.S.',
      'Correo Electrónico': 'contacto@asesoresjuridicos.com',
      'Tipo de Tercero': 'Proveedor'
    },
    {
      'NIT': '79845123',
      'Razón Social / Nombre': 'JUAN CARLOS MARTÍNEZ ROJAS',
      'Correo Electrónico': 'jcmartinez@mantenimientos.com',
      'Tipo de Tercero': 'Proveedor'
    },
    {
      'NIT': '1018456789',
      'Razón Social / Nombre': 'ANDREA CAROLINA RAMÍREZ SUÁREZ',
      'Correo Electrónico': 'andrea.ramirez@primaveraurbana.com.co',
      'Tipo de Tercero': 'Empleado'
    },
    {
      'NIT': '80123456',
      'Razón Social / Nombre': 'FERNANDO LÓPEZ CASTRO',
      'Correo Electrónico': 'fernando.lopez@primaveraurbana.com.co',
      'Tipo de Tercero': 'Empleado'
    }
  ];

  const columns = ['NIT', 'Razón Social / Nombre', 'Correo Electrónico', 'Tipo de Tercero'];
  const worksheet = xlsx.utils.json_to_sheet(sampleData, { header: columns });

  worksheet['!cols'] = [
    { wch: 18 }, // NIT
    { wch: 48 }, // Razón Social / Nombre
    { wch: 40 }, // Correo Electrónico
    { wch: 18 }  // Tipo de Tercero
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Maestro Terceros');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  generateRetencionesTemplateBuffer,
  generateFormulario220TemplateBuffer,
  generateMaestroTercerosTemplateBuffer
};
