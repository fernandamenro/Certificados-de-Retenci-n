const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDatabase() {
  console.log('--- Initializing / Seeding Database ---');

  // 1. Seed default admin if not exists
  const existingAdmin = db.getUserByUsername('admin');
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin1234', salt);
    db.saveUser({
      id: 'user-admin-1',
      username: 'admin',
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('✓ Usuario administrador creado: "admin" (contraseña inicial: "admin1234")');
  } else {
    console.log('✓ Usuario administrador ya configurado.');
  }

  // 2. Seed initial demo data for testing if tables are empty
  const stats = db.getStats();
  if (stats.totalRetencionesRecords === 0) {
    console.log('-> Población de registros de prueba para Retenciones Tributarias...');
    const demoRetenciones = [
      // Proveedor 1: SERVICIOS DE VIGILANCIA Y SEGURIDAD LTDA (NIT 900456789)
      {
        id: 'seed-ret-1',
        nit: '900.456.789-1',
        normalizedNit: '900456789',
        tipoCertificado: 'RENTA',
        cuenta: '236515',
        nombre: 'SERVICIOS DE VIGILANCIA Y SEGURIDAD PRIVADA LTDA',
        descripcion: 'Servicios de Vigilancia y Aseo 2%',
        ano: 2024,
        base: 18450000,
        valor: 369000,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-ret-2',
        nit: '900.456.789-1',
        normalizedNit: '900456789',
        tipoCertificado: 'RENTA',
        cuenta: '236525',
        nombre: 'SERVICIOS DE VIGILANCIA Y SEGURIDAD PRIVADA LTDA',
        descripcion: 'Honorarios Mantenimiento Técnico de Seguridad 11%',
        ano: 2024,
        base: 6200000,
        valor: 682000,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-ret-3',
        nit: '900.456.789-1',
        normalizedNit: '900456789',
        tipoCertificado: 'IVA',
        cuenta: '236701',
        nombre: 'SERVICIOS DE VIGILANCIA Y SEGURIDAD PRIVADA LTDA',
        descripcion: 'Retención de IVA por Servicios Gravados al 19% (Tarifa 15% del IVA)',
        ano: 2024,
        base: 3505500,
        valor: 525825,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-ret-4',
        nit: '900.456.789-1',
        normalizedNit: '900456789',
        tipoCertificado: 'ICA',
        cuenta: '236801',
        nombre: 'SERVICIOS DE VIGILANCIA Y SEGURIDAD PRIVADA LTDA',
        descripcion: 'Retención de ICA Servicios Especializados (9.66 por mil)',
        ano: 2024,
        base: 24650000,
        valor: 238119,
        createdAt: new Date().toISOString()
      },
      // Proveedor 2: ASESORES JURIDICOS & ASOCIADOS S.A.S. (NIT 860123987)
      {
        id: 'seed-ret-5',
        nit: '860.123.987-4',
        normalizedNit: '860123987',
        tipoCertificado: 'RENTA',
        cuenta: '236540',
        nombre: 'ASESORES JURIDICOS & ASOCIADOS S.A.S.',
        descripcion: 'Honorarios Asesoría Jurídica y Cobranza Copropiedad 11%',
        ano: 2024,
        base: 24000000,
        valor: 2640000,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-ret-6',
        nit: '860.123.987-4',
        normalizedNit: '860123987',
        tipoCertificado: 'ICA',
        cuenta: '236802',
        nombre: 'ASESORES JURIDICOS & ASOCIADOS S.A.S.',
        descripcion: 'Retención ICA Actividades de Consultoría Jurídica (9.66 por mil)',
        ano: 2024,
        base: 24000000,
        valor: 231840,
        createdAt: new Date().toISOString()
      },
      // Proveedor 3: JUAN CARLOS MARTINEZ ROJAS (Cédula 79845123)
      {
        id: 'seed-ret-7',
        nit: '79.845.123',
        normalizedNit: '79845123',
        tipoCertificado: 'RENTA',
        cuenta: '236520',
        nombre: 'JUAN CARLOS MARTÍNEZ ROJAS',
        descripcion: 'Servicios Técnicos Mantenimiento Eléctrico e Hidráulico 4%',
        ano: 2024,
        base: 8900000,
        valor: 356000,
        createdAt: new Date().toISOString()
      }
    ];

    db.saveRetenciones(demoRetenciones);
    console.log(`✓ Insertados ${demoRetenciones.length} registros demo de retenciones.`);
  }

  if (stats.totalFormulario220Records === 0) {
    console.log('-> Población de registros de prueba para Formulario 220...');
    const demoEmployees = [
      {
        id: 'seed-f220-1',
        ano: 2024,
        nit: '1018456789',
        normalizedNit: '1018456789',
        primerApellido: 'RAMIREZ',
        segundoApellido: 'SUAREZ',
        primerNombre: 'ANDREA',
        otrosNombres: 'CAROLINA',
        nombreCompleto: 'RAMIREZ SUAREZ ANDREA CAROLINA',
        createdAt: new Date().toISOString(),
        fields: {
          'Entidad Informante': 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA',
          'Tipo de documento': 'CC',
          'Número de identificación del beneficiario': '1018456789',
          'Primer apellido': 'RAMIREZ',
          'Segundo apellido': 'SUAREZ',
          'Primer nombre': 'ANDREA',
          'Otros nombres': 'CAROLINA',
          'Dirección del beneficiario': 'Carrera 7 # 120 - 45 Apto 302',
          'Departamento del beneficiario': 'Meta',
          'Municipio del beneficiario': 'Villavicencio',
          'País del beneficiario': 'Colombia',
          'Pagos por salarios': 48000000,
          'Pagos por emolumentos eclesiásticos': 0,
          'Pagos realizados con bonos electrónicos o de papel de servicio, cheques, tarjetas, vales, etc.': 0,
          'Valor del exceso de los pagos por alimentación mayores a 41 UVT, art.387-1 E.T.': 0,
          'Pagos por honorarios': 0,
          'Pagos por servicios': 0,
          'Pagos por comisiones': 0,
          'Pagos por prestaciones sociales': 8000000,
          'Pagos por viáticos': 0,
          'Pagos por gastos de representación': 0,
          'Pagos por compensaciones de trabajo asociado cooperativo': 0,
          'Valor apoyos económicos no reembolsables o condonados, entregados por el Estado o financiados con recursos públicos, para financiar programas educativos': 0,
          'Otros pagos': 0,
          'Cesantías e intereses de cesantías efectivamente pagadas al empleado.': 480000,
          'Cesantías consignadas al fondo de cesantías.': 4000000,
          'Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo, Capítulo VII, Título VIII Parte Primera': 0,
          'Pensiones de jubilación, vejez o invalidez': 0,
          'Total, Ingresos brutos de rentas de trabajo y pensión': 60480000,
          'Aportes Obligatorios por Salud a cargo del trabajador': 1920000,
          'Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador': 1920000,
          'Aportes voluntarios al régimen de ahorro individual con solidaridad – RAIS': 0,
          'Aportes voluntarios a fondos de pensiones voluntarias': 1500000,
          'Aportes a cuentas AFC': 800000,
          'Aportes a cuentas AVC': 0,
          'Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones': 1680000,
          'Impuesto sobre las ventas – IVA, mayor valor del costo o gasto': 0,
          'Retención en la fuente a título de impuesto sobre las ventas – IVA': 0,
          'Pagos por alimentación hasta a 41 UVT': 0,
          'Valor ingreso laboral promedio de los últimos seis meses': 4000000,
          'Tipo de documento del dependiente económico': 'TI',
          'Número de Identificación del dependiente económico': '1122334455'
        }
      },
      {
        id: 'seed-f220-2',
        ano: 2024,
        nit: '80123456',
        normalizedNit: '80123456',
        primerApellido: 'LOPEZ',
        segundoApellido: 'CASTRO',
        primerNombre: 'FERNANDO',
        otrosNombres: '',
        nombreCompleto: 'LOPEZ CASTRO FERNANDO',
        createdAt: new Date().toISOString(),
        fields: {
          'Entidad Informante': 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA',
          'Tipo de documento': 'CC',
          'Número de identificación del beneficiario': '80123456',
          'Primer apellido': 'LOPEZ',
          'Segundo apellido': 'CASTRO',
          'Primer nombre': 'FERNANDO',
          'Otros nombres': '',
          'Dirección del beneficiario': 'Calle 15 # 40 - 01',
          'Departamento del beneficiario': 'Meta',
          'Municipio del beneficiario': 'Villavicencio',
          'País del beneficiario': 'Colombia',
          'Pagos por salarios': 33600000,
          'Pagos por emolumentos eclesiásticos': 0,
          'Pagos realizados con bonos electrónicos o de papel de servicio, cheques, tarjetas, vales, etc.': 0,
          'Valor del exceso de los pagos por alimentación mayores a 41 UVT, art.387-1 E.T.': 0,
          'Pagos por honorarios': 0,
          'Pagos por servicios': 0,
          'Pagos por comisiones': 0,
          'Pagos por prestaciones sociales': 5600000,
          'Pagos por viáticos': 0,
          'Pagos por gastos de representación': 0,
          'Pagos por compensaciones de trabajo asociado cooperativo': 0,
          'Valor apoyos económicos no reembolsables o condonados, entregados por el Estado o financiados con recursos públicos, para financiar programas educativos': 0,
          'Otros pagos': 0,
          'Cesantías e intereses de cesantías efectivamente pagadas al empleado.': 336000,
          'Cesantías consignadas al fondo de cesantías.': 2800000,
          'Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo, Capítulo VII, Título VIII Parte Primera': 0,
          'Pensiones de jubilación, vejez o invalidez': 0,
          'Total, Ingresos brutos de rentas de trabajo y pensión': 42336000,
          'Aportes Obligatorios por Salud a cargo del trabajador': 1344000,
          'Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador': 1344000,
          'Aportes voluntarios al régimen de ahorro individual con solidaridad – RAIS': 0,
          'Aportes voluntarios a fondos de pensiones voluntarias': 0,
          'Aportes a cuentas AFC': 0,
          'Aportes a cuentas AVC': 0,
          'Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones': 345000,
          'Impuesto sobre las ventas – IVA, mayor valor del costo o gasto': 0,
          'Retención en la fuente a título de impuesto sobre las ventas – IVA': 0,
          'Pagos por alimentación hasta a 41 UVT': 0,
          'Valor ingreso laboral promedio de los últimos seis meses': 2800000,
          'Tipo de documento del dependiente económico': '',
          'Número de Identificación del dependiente económico': ''
        }
      }
    ];

    db.saveFormulario220(demoEmployees);
    console.log(`✓ Insertados ${demoEmployees.length} empleados de prueba en Formulario 220.`);
  }

  // 3. Seed initial Maestro de Terceros with emails for OTP flow
  const updatedStats = db.getStats();
  if (updatedStats.totalMaestroTerceros === 0) {
    console.log('-> Población inicial del Maestro de Terceros con correos para OTP...');
    const demoMaestro = [
      {
        nit: '901.680.045-8',
        normalizedNit: '901680045',
        razonSocial: 'GRUPO EMPRESARIAL PRIMAVERA S.A.S.',
        email: 'facturacion@grupoprimavera.com',
        tipoTercero: 'proveedor'
      },
      {
        nit: '900.456.789-1',
        normalizedNit: '900456789',
        razonSocial: 'SERVICIOS DE VIGILANCIA Y SEGURIDAD PRIVADA LTDA',
        email: 'notificaciones@vigilanciaprivada.com',
        tipoTercero: 'proveedor'
      },
      {
        nit: '860.123.987-4',
        normalizedNit: '860123987',
        razonSocial: 'ASESORES JURIDICOS & ASOCIADOS S.A.S.',
        email: 'contacto@asesoresjuridicos.com',
        tipoTercero: 'proveedor'
      },
      {
        nit: '79.845.123',
        normalizedNit: '79845123',
        razonSocial: 'JUAN CARLOS MARTÍNEZ ROJAS',
        email: 'jcmartinez@mantenimientos.com',
        tipoTercero: 'proveedor'
      },
      {
        nit: '1018456789',
        normalizedNit: '1018456789',
        razonSocial: 'RAMIREZ SUAREZ ANDREA CAROLINA',
        email: 'andrea.ramirez@primaveraurbana.com.co',
        tipoTercero: 'empleado'
      },
      {
        nit: '80123456',
        normalizedNit: '80123456',
        razonSocial: 'LOPEZ CASTRO FERNANDO',
        email: 'fernando.lopez@primaveraurbana.com.co',
        tipoTercero: 'empleado'
      }
    ];

    // Also auto-register any existing suppliers in retenciones that might not be in demoMaestro
    const retenciones = db.data.retenciones || [];
    retenciones.forEach(r => {
      const clean = String(r.normalizedNit).trim();
      if (!clean) return;
      const already = demoMaestro.find(m => m.normalizedNit === clean);
      if (!already) {
        demoMaestro.push({
          nit: r.nit || clean,
          normalizedNit: clean,
          razonSocial: r.nombre || 'PROVEEDOR REGISTRADO',
          email: `contacto.${clean}@primaveraurbana.com.co`,
          tipoTercero: 'proveedor'
        });
      }
    });

    db.bulkSaveMaestroTerceros(demoMaestro);
    console.log(`✓ Insertados ${demoMaestro.length} registros en el Maestro de Terceros.`);
  }

  console.log('✓ Inicialización completada.');
}

module.exports = seedDatabase;
