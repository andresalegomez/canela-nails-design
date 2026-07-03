require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');
const { loggerMiddleware } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);

app.use(loggerMiddleware);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/cash', require('./routes/cash'));
app.use('/api/liquidations', require('./routes/liquidations'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/db-manager', require('./routes/db-manager'));
app.use('/api/availability', require('./routes/availability'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
