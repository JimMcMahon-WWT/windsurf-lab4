# First Service Guide - User Service

## ✅ What We've Created

Your **User Service** is now fully implemented with:

- ✅ Complete folder structure
- ✅ Authentication (register, login)
- ✅ User profile management
- ✅ JWT token generation
- ✅ Password hashing with bcrypt
- ✅ Input validation
- ✅ Database repository layer
- ✅ Express REST API
- ✅ Error handling
- ✅ Logging with Winston
- ✅ TypeScript with strict typing
- ✅ Database migrations
- ✅ Dockerfile

---

## 🎯 Next Steps to Run the Service

### Step 1: Install Dependencies

```powershell
# Navigate to user service
cd "c:\Users\mcmahonj\CascadeProjects\module 4\services\user-service"

# Install dependencies
npm install
```

**This installs:**
- Express (web framework)
- PostgreSQL client (pg)
- JWT & bcrypt (authentication)
- TypeScript & ts-node
- Winston (logging)
- And more...

**Expected time:** 30-60 seconds

---

### Step 2: Setup Environment Variables

```powershell
# Copy the template
Copy-Item .env.example .env

# Edit the file
notepad .env
```

**Minimum configuration for local development:**
```bash
NODE_ENV=development
PORT=3001
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=user_db
JWT_SECRET=my_super_secret_key_at_least_32_characters_long_12345
```

**Important:** Change `JWT_SECRET` to a secure random string!

---

### Step 3: Setup PostgreSQL Database

You have two options:

#### Option A: Use Docker (Recommended)

```powershell
# Go back to project root
cd "c:\Users\mcmahonj\CascadeProjects\module 4"

# Create docker-compose.yml for infrastructure (will create later)
# For now, run PostgreSQL directly:
docker run --name ecommerce-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  -d postgres:15-alpine
```

#### Option B: Use Local PostgreSQL

If you have PostgreSQL installed locally, just create the database:

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE user_db;

# Exit
\q
```

---

### Step 4: Run Database Migrations

```powershell
# Make sure you're in user-service directory
cd "c:\Users\mcmahonj\CascadeProjects\module 4\services\user-service"

# Run the migration
psql -U postgres -d user_db -f migrations\001_create_users_table.sql
```

**This creates:**
- `users` table with all columns
- `addresses` table
- Indexes for performance
- Triggers for automatic timestamp updates

**Verify it worked:**
```powershell
psql -U postgres -d user_db -c "\dt"
```

You should see:
```
        List of relations
 Schema |   Name    | Type  |  Owner
--------+-----------+-------+----------
 public | addresses | table | postgres
 public | users     | table | postgres
```

---

### Step 5: Run the Service

```powershell
# Development mode (auto-reload on changes)
npm run dev
```

**Expected output:**
```
2024-01-15 10:30:00 [user-service] info: Database connected successfully
2024-01-15 10:30:00 [user-service] info: User service running on port 3001
2024-01-15 10:30:00 [user-service] info: Environment: development
2024-01-15 10:30:00 [user-service] info: Health check: http://localhost:3001/health
```

**If you see this, SUCCESS! 🎉**

---

## 🧪 Test Your Service

### Test 1: Health Check

Open a new PowerShell window:

```powershell
# Test health endpoint
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "user-service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Test 2: Register a User

```powershell
# Register a new user
Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"test@example.com","password":"password123","first_name":"John","last_name":"Doe"}' | Select-Object -Expand Content
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": null,
    "role": "customer",
    "is_email_verified": false,
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "User registered successfully"
}
```

---

### Test 3: Login

```powershell
# Login with the registered user
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"test@example.com","password":"password123"}' | 
  ConvertFrom-Json

# Display response
$response | ConvertTo-Json -Depth 10

# Save token for next test
$token = $response.data.token
echo "Token saved: $token"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer",
      "is_email_verified": false,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

---

### Test 4: Get Profile (Protected Route)

```powershell
# Use the token from login
Invoke-WebRequest -Uri "http://localhost:3001/api/users/profile" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} | 
  Select-Object -Expand Content
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": null,
    "role": "customer",
    "is_email_verified": false,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 📊 Service Structure Overview

```
user-service/
├── src/
│   ├── config/           # Database & logger configuration
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Database queries
│   ├── routes/           # API endpoints
│   ├── middlewares/      # Auth & error handling
│   ├── types/            # TypeScript interfaces
│   ├── utils/            # Helper functions
│   ├── app.ts            # Express setup
│   └── server.ts         # Entry point
└── migrations/           # Database schemas
```

**Request Flow:**
```
Client → Routes → Middleware → Controller → Service → Repository → Database
                                    ↓
                            Response ← Transform ← Result
```

---

## 🐛 Troubleshooting

### Database Connection Failed

**Error:** `ECONNREFUSED` or `password authentication failed`

```powershell
# Check if PostgreSQL is running
docker ps | Select-String postgres

# Restart PostgreSQL
docker restart ecommerce-postgres

# Verify .env file has correct credentials
Get-Content .env | Select-String POSTGRES
```

---

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

```powershell
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

---

### TypeScript Compilation Errors

```powershell
# Clean and rebuild
npm run clean
npm run build

# Check TypeScript config
npx tsc --showConfig
```

---

### Module Not Found Errors

```powershell
# Reinstall dependencies
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install` successful)
- [ ] `.env` file created with database credentials
- [ ] PostgreSQL running and accessible
- [ ] Database migrations completed
- [ ] Service starts without errors (`npm run dev`)
- [ ] Health check returns `200 OK`
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Profile endpoint requires authentication

---

## 🎯 What's Next?

### 1. Build More Services

Use the same pattern to create:
- **Product Service** (port 3002)
- **Cart Service** (port 3003)
- **Order Service** (port 3004)

### 2. Add Shared Packages

Create reusable code in `packages/common`:
```powershell
cd "c:\Users\mcmahonj\CascadeProjects\module 4\packages\common"
# Create shared utilities, types, etc.
```

### 3. Setup Infrastructure

Create `infrastructure/docker/docker-compose.yml` with:
- PostgreSQL
- Redis
- Kafka
- Elasticsearch

### 4. Add Tests

```powershell
# Create test files
mkdir tests\unit, tests\integration

# Run tests
npm run test
```

---

## 📚 Additional Resources

- [Service README](./services/user-service/README.md)
- [Database Schemas](./DATABASE_SCHEMAS.md)
- [API Documentation](./docs/api/user-service.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

---

## 🎉 Congratulations!

You've successfully created and run your first microservice!

**Your User Service is:**
- ✅ Running on http://localhost:3001
- ✅ Connected to PostgreSQL
- ✅ Ready to handle authentication
- ✅ Following best practices (layered architecture, TypeScript, validation)

Keep the service running and move on to creating more services or testing with a REST client!
