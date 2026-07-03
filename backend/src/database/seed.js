require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.umuovnnqxrkwxixvnymg:uib4iub4iub3io3obib3o4obnk4@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  prepareThreshold: 0
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting seed...');

    const adminPassword = await bcrypt.hash('CanelaaaND2025', 10);
    await client.query({
      text: `INSERT INTO users (id, username, email, password, role, first_name, last_name, is_approved, can_charge_clients, is_active)
      SELECT gen_random_uuid(), 'CanelaNailsDesign', 'canelanailsdesign@gmail.com', $1::text, 'admin', 'Canela', 'Nails Design', true, true, true
      ON CONFLICT (email) DO NOTHING`,
      values: [adminPassword],
      prepareThreshold: 0
    });

    const services = [
      { name: 'Manicuria Basica', description: 'Manicuria clasica con esmalte regular', duration: 30, price: 15000 },
      { name: 'Manicuria Semipermanente', description: 'Manicuria con esmalte semipermanente', duration: 45, price: 22000 },
      { name: 'Manicuria Acrilica', description: 'Uñas acrilicas completas', duration: 90, price: 45000 },
      { name: 'Pedicuria Basica', description: 'Pedicuria clasica', duration: 40, price: 18000 },
      { name: 'Pedicuria Semipermanente', description: 'Pedicuria con esmalte semipermanente', duration: 55, price: 28000 },
      { name: 'Diseño de Uñas', description: 'Diseño artístico personalizado', duration: 30, price: 15000 },
      { name: 'Relleno Acrilico', description: 'Relleno de uñas acrilicas', duration: 60, price: 35000 },
      { name: 'Retiro de Acrilico', description: 'Retiro profesional de acrilico', duration: 45, price: 20000 },
      { name: 'Spa de Manos', description: 'Tratamiento spa completo para manos', duration: 50, price: 30000 },
      { name: 'Spa de Pies', description: 'Tratamiento spa completo para pies', duration: 60, price: 35000 },
      { name: 'Capping en Gel', description: 'Capa de gel protectora', duration: 25, price: 12000 },
      { name: 'Manicuria Express', description: 'Manicuria rapida con esmalte', duration: 20, price: 10000 }
    ];

    for (const svc of services) {
      await client.query({
        text: `INSERT INTO services (id, name, description, duration_minutes, price, is_active)
        SELECT gen_random_uuid(), $1::text, $2::text, $3::integer, $4::decimal, true
        WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = $1::text)`,
        values: [svc.name, svc.description, svc.duration, svc.price],
        prepareThreshold: 0
      });
    }

    await client.query({
      text: `INSERT INTO virtual_surcharge_config (id, type, value, is_active)
      SELECT gen_random_uuid(), 'percent'::surcharge_type, 10.00, true
      WHERE NOT EXISTS (SELECT 1 FROM virtual_surcharge_config WHERE is_active = true)`,
      values: [],
      prepareThreshold: 0
    });

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seed;
