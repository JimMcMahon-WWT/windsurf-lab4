# User Service

Authentication and user management microservice for the e-commerce platform.

## Features

- ✅ User registration
- ✅ User login (JWT authentication)
- ✅ Profile management
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (customer/admin)
- ✅ Input validation
- ✅ PostgreSQL database

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### User Management

- `GET /api/users/profile` - Get current user profile (requires auth)
- `PUT /api/users/profile` - Update user profile (requires auth)
- `GET /api/users/:id` - Get user by ID (admin only)

### Health Check

- `GET /health` - Service health check

## Setup

### 1. Install Dependencies

```bash
cd services/user-service
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
notepad .env
```

Required variables:
```
PORT=3001
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=user_db
JWT_SECRET=your_secret_key_min_32_characters
```

### 3. Setup Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE user_db;"

# Run migrations
psql -U postgres -d user_db -f migrations/001_create_users_table.sql
```

### 4. Run the Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

## Testing

### Manual Testing with curl

**Register a user:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get profile (with token):**
```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure

```
user-service/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts
│   │   └── logger.ts
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.ts
│   │   └── user.controller.ts
│   ├── services/         # Business logic
│   │   └── user.service.ts
│   ├── repositories/     # Database access
│   │   └── user.repository.ts
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── index.ts
│   ├── middlewares/      # Express middlewares
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── types/            # TypeScript types
│   │   └── user.types.ts
│   ├── utils/            # Utilities
│   │   ├── auth.utils.ts
│   │   └── validation.ts
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── migrations/           # Database migrations
├── tests/                # Tests
├── Dockerfile
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Service port | 3001 |
| `POSTGRES_HOST` | PostgreSQL host | localhost |
| `POSTGRES_PORT` | PostgreSQL port | 5432 |
| `POSTGRES_USER` | PostgreSQL user | postgres |
| `POSTGRES_PASSWORD` | PostgreSQL password | postgres |
| `POSTGRES_DB` | Database name | user_db |
| `JWT_SECRET` | JWT secret key | (required) |
| `JWT_EXPIRY` | JWT expiry time | 15m |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiry | 7d |
| `BCRYPT_ROUNDS` | Bcrypt hashing rounds | 12 |
| `LOG_LEVEL` | Logging level | debug |

## Technologies

- **Node.js 18+** - Runtime
- **TypeScript** - Type safety
- **Express** - Web framework
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **Joi** - Input validation
- **Winston** - Logging
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
