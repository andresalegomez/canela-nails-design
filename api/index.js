const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection (lazy)
let dbConnected = false;
async function ensureDb() {
  if (!dbConnected) {
    const sequelize = require('./src/database/config');
    await sequelize.authenticate();
    dbConnected = true;
  }
}

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/services', require('./src/routes/services'));
app.use('/api/employees', require('./src/routes/employees'));
app.use('/api/appointments', require('./src/routes/appointments'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/cash', require('./src/routes/cash'));
app.use('/api/liquidations', require('./src/routes/liquidations'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/logs', require('./src/routes/logs'));
app.use('/api/db-manager', require('./src/routes/db-manager'));
app.use('/api/availability', require('./src/routes/availability'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Vercel serverless handler
module.exports = async (req, res) => {
  await ensureDb();
  return app(req, res);
};

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  ensureDb().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}
