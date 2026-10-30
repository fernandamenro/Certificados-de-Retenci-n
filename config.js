require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'ccprimavera_contabilidad_super_secret_key_2026',
  JWT_EXPIRES_IN: '8h',
  GWORKSPACE_EMAIL: process.env.GWORKSPACE_EMAIL || 'contabilidad@primaveraurbana.com.co',
  GWORKSPACE_APP_PASSWORD: process.env.GWORKSPACE_APP_PASSWORD || '',
  GWORKSPACE_SMTP_HOST: process.env.GWORKSPACE_SMTP_HOST || 'smtp.gmail.com',
  GWORKSPACE_SMTP_PORT: parseInt(process.env.GWORKSPACE_SMTP_PORT || '465', 10),
  GWORKSPACE_SECURE: true,
  GWORKSPACE_FROM_NAME: 'Primavera Urbana - Contabilidad',
  OTP_EXPIRATION_MINUTES: 10,
  DATA_DIR: path.join(__dirname, 'database', 'data'),
  DB_FILE: path.join(__dirname, 'database', 'data', 'store.json'),
  UPLOADS_DIR: path.join(__dirname, 'database', 'data', 'uploads')
};
