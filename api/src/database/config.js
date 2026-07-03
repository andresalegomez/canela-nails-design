require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres.umuovnnqxrkwxixvnymg:uib4iub4iub3io3obib3o4obnk4@aws-0-us-east-1.pooler.supabase.com:6543/postgres', {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    prepareThreshold: 0
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
    prepareThreshold: 0
  }
});

module.exports = sequelize;
