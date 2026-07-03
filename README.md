# Canela Nails Design - Sistema de Gestión

Sistema full-stack para la gestión integral de turnos, servicios, empleados, clientes, pagos, caja, comisiones y estadísticas de un centro de estética.

## Stack Tecnológico

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (Supabase)
- **Autenticación:** JWT (bcrypt)

## Funcionalidades

### Administrador
- Dashboard con estadísticas y turnos pendientes de aprobación
- Gestión completa de usuarios (empleados, clientes)
- Aprobar/rechazar registros de usuarios
- Habilitar/deshabilitar cobro a clientes por empleado
- Bloqueo de usuarios, emails, DNI y teléfonos
- Gestión de servicios y precios
- Gestión de turnos (crear, editar, cancelar, asignar)
- Gestión de pagos (parciales, totales, reversión)
- Caja: saldo, ingresos, egresos, historial
- Liquidación de profesionales (efectivo, virtual, mixto)
- Reportes exportables a Excel
- Logs del sistema con paginación
- Gestión de base de datos (CRUD de todas las tablas)
- Notificaciones en tiempo real (localStorage sync)

### Empleado
- Dashboard con turnos del día y comisión estimada
- Vista de agenda y turnos asignados
- Estadísticas personales

### Cliente
- Reserva de turnos con disponibilidad en tiempo real
- Historial de turnos
- Cancelación de turnos (24h rule)
- Reasignación de turnos

## Instalación

### Requisitos previos
- Node.js >= 18
- npm
- PostgreSQL (o Supabase)

### Backend
```bash
cd backend
npm install
# Configurar .env (ver .env.example)
node src/database/migrate.js
node src/database/seed.js
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Credenciales Admin
- Email: canelanailsdesign@gmail.com
- Usuario: CanelaNailsDesign
- Contraseña: CanelaaaND2025

## Estructura del Proyecto

```
canela-nails-design/
├── backend/
│   ├── src/
│   │   ├── index.js          # Entry point del servidor
│   │   ├── database/         # Config, migraciones, seeds
│   │   ├── middleware/       # Auth JWT, logger
│   │   ├── models/           # Modelos Sequelize
│   │   ├── routes/           # Rutas API RESTful
│   │   └── utils/            # Helpers, Excel, validaciones
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router principal
│   │   ├── components/       # Layout, componentes compartidos
│   │   ├── context/          # Auth context
│   │   ├── pages/            # Páginas por rol
│   │   │   ├── admin/        # Panel administrador
│   │   │   ├── employee/     # Panel empleado
│   │   │   └── client/       # Panel cliente
│   │   ├── services/         # API client
│   │   └── utils/            # Helpers
│   └── package.json
└── README.md
```

## API Endpoints

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/me` - Obtener usuario actual
- `GET /api/users` - Listar usuarios
- `POST /api/services` - Crear servicio
- `GET /api/availability` - Verificar disponibilidad
- `POST /api/appointments` - Crear turno
- `POST /api/payments` - Registrar pago
- `GET /api/cash/balance` - Ver saldo de caja
- `POST /api/liquidations` - Liquidar profesional
- `GET /api/reports/excel` - Exportar Excel
- `GET /api/db-manager/tables` - Listar tablas BD

## Reglas de Negocio

- Cancelación: hasta 24h antes (clientes), sin restricción (admin)
- Pagos mixtos: efectivo afecta caja, virtual solo se registra
- Recargos virtuales: solo para cliente, no afectan comisión
- Horarios de empleados: disponibilidad en intervalos de 5 minutos
- Estados de turno: solicitado → agendado → completado → liquidado
