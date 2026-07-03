require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.umuovnnqxrkwxixvnymg:uib4iub4iub3io3obib3o4obnk4@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  prepareThreshold: 0
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'employee', 'client');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE appointment_status AS ENUM ('solicitado', 'agendado', 'completado', 'cancelado', 'liquidado');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('efectivo', 'virtual', 'mixto');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE cash_movement_type AS ENUM ('ingreso', 'egreso');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE surcharge_type AS ENUM ('percent', 'fixed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'client',
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        dni VARCHAR(20) UNIQUE,
        phone VARCHAR(20),
        is_approved BOOLEAN DEFAULT false,
        can_charge_clients BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        blocked BOOLEAN DEFAULT false,
        blocked_email BOOLEAN DEFAULT false,
        blocked_dni BOOLEAN DEFAULT false,
        blocked_phone BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
        service_id UUID REFERENCES services(id) ON DELETE CASCADE,
        custom_price DECIMAL(10,2),
        commission_percent DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, service_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_breaks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_number SERIAL,
        client_id UUID REFERENCES users(id) ON DELETE SET NULL,
        employee_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status appointment_status DEFAULT 'solicitado',
        base_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        cancellation_reason TEXT,
        cancelled_by UUID REFERENCES users(id),
        cancelled_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guest_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        dni VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_method payment_method NOT NULL,
        virtual_amount DECIMAL(10,2) DEFAULT 0,
        cash_amount DECIMAL(10,2) DEFAULT 0,
        virtual_surcharge_percent DECIMAL(5,2) DEFAULT 0,
        virtual_surcharge_amount DECIMAL(10,2) DEFAULT 0,
        is_partial BOOLEAN DEFAULT false,
        description TEXT,
        recorded_by UUID REFERENCES users(id),
        is_reversed BOOLEAN DEFAULT false,
        reversed_at TIMESTAMP,
        reversed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        balance DECIMAL(12,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO cash_register (id, balance) 
      SELECT gen_random_uuid(), 0 
      WHERE NOT EXISTS (SELECT 1 FROM cash_register);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type cash_movement_type NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(50),
        reference_id UUID,
        appointment_number INTEGER,
        virtual_amount DECIMAL(10,2) DEFAULT 0,
        cash_amount DECIMAL(10,2) DEFAULT 0,
        performed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS liquidations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES users(id) ON DELETE RESTRICT,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method payment_method NOT NULL,
        virtual_amount DECIMAL(10,2) DEFAULT 0,
        cash_amount DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        performed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS liquidation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        liquidation_id UUID REFERENCES liquidations(id) ON DELETE CASCADE,
        appointment_id UUID REFERENCES appointments(id) ON DELETE RESTRICT,
        service_name VARCHAR(255),
        client_name VARCHAR(255),
        appointment_date DATE,
        appointment_time TIME,
        appointment_number INTEGER,
        base_price DECIMAL(10,2),
        commission_percent DECIMAL(5,2),
        commission_amount DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS virtual_surcharge_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type surcharge_type NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50),
        title VARCHAR(255),
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const adminPassword = await bcrypt.hash('CanelaaaND2025', 10);
    await client.query(`
      INSERT INTO users (id, username, email, password, role, first_name, last_name, is_approved, can_charge_clients, is_active)
      SELECT 
        gen_random_uuid(), 
        'CanelaNailsDesign', 
        'canelanailsdesign@gmail.com', 
        $1, 
        'admin', 
        'Canela', 
        'Nails Design', 
        true, 
        true, 
        true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'canelanailsdesign@gmail.com');
    `, [adminPassword]);

    await client.query(`
      INSERT INTO virtual_surcharge_config (id, type, value, is_active)
      SELECT gen_random_uuid(), 'percent', 10.00, true
      WHERE NOT EXISTS (SELECT 1 FROM virtual_surcharge_config WHERE is_active = true);
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrate;
