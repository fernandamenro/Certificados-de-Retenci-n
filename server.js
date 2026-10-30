const os = require('os');
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const seedDatabase = require('./database/seed');

// Routes
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const recordsRoutes = require('./routes/recordsRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static files (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/records', recordsRoutes);

// Fallback for SPA routing
app.use((req, res) => {
  res.sendFile('index.html', { root: path.resolve(__dirname, 'public') });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'Ocurrió un error inesperado en el servidor.'
  });
});

function getNetworkIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, ip: net.address });
      }
    }
  }
  return results;
}

// Start Server
async function start() {
  try {
    await seedDatabase();
    app.listen(config.PORT, () => {
      const networkIps = getNetworkIps();
      const primaryIp = networkIps[0]?.ip || '127.0.0.1';
      console.log('================================================================');
      console.log(`🚀 Portal de Certificados Tributarios - Centro Comercial`);
      console.log(`📡 Servidor activo y escuchando en puerto ${config.PORT}`);
      console.log(`💻 Acceso Local: http://localhost:${config.PORT}`);
      networkIps.forEach(({ name, ip }) => {
        console.log(`🌐 Acceso por Dirección IP (${name}): http://${ip}:${config.PORT}`);
      });
      console.log(`🔐 Módulo Privado Contable: http://${primaryIp}:${config.PORT}#admin`);
      console.log(`👤 Usuario inicial: admin | Contraseña: admin1234`);
      console.log('================================================================');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
