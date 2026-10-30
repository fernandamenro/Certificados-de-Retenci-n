/**
 * Utility to convert numbers to Colombian Spanish currency words
 * Example: 15320500 -> "QUINCE MILLONES TRESCIENTOS VEINTE MIL QUINIENTOS PESOS M/CTE"
 */

function unidades(num) {
  switch (num) {
    case 1: return 'UN';
    case 2: return 'DOS';
    case 3: return 'TRES';
    case 4: return 'CUATRO';
    case 5: return 'CINCO';
    case 6: return 'SEIS';
    case 7: return 'SIETE';
    case 8: return 'OCHO';
    case 9: return 'NUEVE';
    default: return '';
  }
}

function decenas(num) {
  const dec = Math.floor(num / 10);
  const uni = num - (dec * 10);

  switch (dec) {
    case 1:
      switch (uni) {
        case 0: return 'DIEZ';
        case 1: return 'ONCE';
        case 2: return 'DOCE';
        case 3: return 'TRECE';
        case 4: return 'CATORCE';
        case 5: return 'QUINCE';
        default: return 'DIECI' + unidades(uni);
      }
    case 2:
      if (uni === 0) return 'VEINTE';
      return 'VEINTI' + unidades(uni);
    case 3: return decenasY('TREINTA', uni);
    case 4: return decenasY('CUARENTA', uni);
    case 5: return decenasY('CINCUENTA', uni);
    case 6: return decenasY('SESENTA', uni);
    case 7: return decenasY('SETENTA', uni);
    case 8: return decenasY('OCHENTA', uni);
    case 9: return decenasY('NOVENTA', uni);
    case 0: return unidades(uni);
    default: return '';
  }
}

function decenasY(strSin, numUni) {
  if (numUni > 0) return strSin + ' Y ' + unidades(numUni);
  return strSin;
}

function centenas(num) {
  const cen = Math.floor(num / 100);
  const dec = num - (cen * 100);

  switch (cen) {
    case 1:
      if (dec > 0) return 'CIENTO ' + decenas(dec);
      return 'CIEN';
    case 2: return 'DOSCIENTOS ' + decenas(dec);
    case 3: return 'TRESCIENTOS ' + decenas(dec);
    case 4: return 'CUATROCIENTOS ' + decenas(dec);
    case 5: return 'QUINIENTOS ' + decenas(dec);
    case 6: return 'SEISCIENTOS ' + decenas(dec);
    case 7: return 'SETECIENTOS ' + decenas(dec);
    case 8: return 'OCHOCIENTOS ' + decenas(dec);
    case 9: return 'NOVECIENTOS ' + decenas(dec);
    default: return decenas(dec);
  }
}

function seccion(num, divisor, strSingular, strPlural) {
  const cientos = Math.floor(num / divisor);
  const resto = num - (cientos * divisor);

  let letras = '';
  if (cientos > 0) {
    if (cientos > 1) {
      letras = centenas(cientos) + ' ' + strPlural;
    } else {
      letras = strSingular;
    }
  }

  if (resto > 0) {
    letras += '';
  }
  return { letras, resto };
}

function numeroALetras(num) {
  if (num === null || num === undefined || isNaN(num)) return 'CERO PESOS M/CTE';
  num = Math.round(Number(num));
  if (num === 0) return 'CERO PESOS M/CTE';
  if (num < 0) return 'MENOS ' + numeroALetras(Math.abs(num));

  let data = {
    numero: num,
    enteros: Math.floor(num),
    letrasPesos: ''
  };

  const millones = seccion(data.enteros, 1000000, 'UN MILLÓN', 'MILLONES');
  const miles = seccion(millones.resto, 1000, 'MIL', 'MIL');
  const cientos = centenas(miles.resto);

  let resultado = '';
  if (millones.letras) resultado += millones.letras + ' ';
  if (miles.letras) resultado += miles.letras + ' ';
  if (cientos) resultado += cientos;

  resultado = resultado.trim().replace(/\s+/g, ' ');

  if (data.enteros === 1) {
    return `${resultado} PESO M/CTE`;
  }
  return `${resultado} PESOS M/CTE`;
}

module.exports = {
  numeroALetras
};
