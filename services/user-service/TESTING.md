# User Service - Testing Guide

This guide will help you test the foundation we've built so far.

---

## Prerequisites

Before testing, ensure you have:

### 1. PostgreSQL (version 12+)

```powershell
# Check if installed
postgres --version

# If not installed, download from: https://www.postgresql.org/download/windows/
# Or use Docker:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name postgres-test postgres:15-alpine
```

### 2. Redis (version 6+)

```powershell
# Check if installed
redis-cli --version

# If not installed, download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 --name redis-test redis:7-alpine
```

### 3. Node.js (version 18+)

```powershell
node --version
npm --version
```

---

## Step-by-Step Testing

### Step 1: Configure Environment

```powershell
cd c:\Users\mcmahonj\CascadeProjects\module 4\services\user-service

# Copy environment template
Copy-Item .env.example .env
```

**Edit `.env` file** and update these critical values:

```env
# Use strong secrets for production!
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_change_this
JWT_REFRESH_SECRET=your_different_refresh_secret_key_also_32_chars_long

# Database settings (if different from defaults)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=user_db

# Redis settings (if different from defaults)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

### Step 2: Create Database

```powershell
# Option A: Using psql command line
$env:PGPASSWORD = "postgres"
psql -U postgres -c "CREATE DATABASE user_db;"

# Option B: Using pgAdmin
# 1. Open pgAdmin
# 2. Connect to your PostgreSQL server
# 3. Right-click Databases → Create → Database
# 4. Name: user_db
# 5. Click Save

# Option C: Using Docker (if using Docker postgres)
docker exec -it postgres-test psql -U postgres -c "CREATE DATABASE user_db;"
```

---

### Step 3: Run Database Migrations

This will create all necessary tables:

```powershell
npm run migrate
```

**Expected Output:**

```
🚀 Starting database migrations...

✅ Database connection established

Found 2 migration files:

📄 Running: 001_create_users_table.sql
✅ 001_create_users_table.sql completed

📄 Running: 002_add_auth_and_preferences.sql
✅ 002_add_auth_and_preferences.sql completed

🎉 All migrations completed successfully!
```

**If you get an error:**

- Check that PostgreSQL is running
- Verify database credentials in `.env`
- Ensure database `user_db` exists

---

### Step 4: Test the Setup

Run comprehensive tests to verify everything works:

```powershell
npm run test:setup
```

**Expected Output:**

```
🧪 Testing User Service Setup

════════════════════════════════════════════════════════════

📦 Test 1: PostgreSQL Connection
────────────────────────────────────────────────────────────
✅ PostgreSQL connection successful

📦 Test 2: Redis Connection
────────────────────────────────────────────────────────────
✅ Redis connection successful

📦 Test 3: Redis Session Operations
────────────────────────────────────────────────────────────
✅ Session set successfully
✅ Session retrieved successfully

📦 Test 4: Password Hashing & Verification
────────────────────────────────────────────────────────────
✅ Password hashed successfully
✅ Password verification successful
✅ Wrong password correctly rejected

📦 Test 5: JWT Token Operations
────────────────────────────────────────────────────────────
✅ Access token generated
✅ Access token verified successfully
✅ Refresh token generated
✅ Refresh token verified successfully

📦 Test 6: Password Reset Token
────────────────────────────────────────────────────────────
✅ Reset token generated: 3f5a8b9c2d1e4f7a...
✅ Reset token hashed successfully

📦 Test 7: Database Tables
────────────────────────────────────────────────────────────
✅ Table 'users' exists
✅ Table 'refresh_tokens' exists
✅ Table 'user_preferences' exists
✅ Table 'sessions' exists
✅ Table 'audit_logs' exists
✅ Table 'addresses' exists

════════════════════════════════════════════════════════════
🎉 All tests passed! Setup is complete.

✨ You can now continue building the service.
════════════════════════════════════════════════════════════
```

---

## Troubleshooting

### Test 1 Failed (PostgreSQL Connection)

**Error:** `Unable to connect to PostgreSQL database`

**Solutions:**

1. Check if PostgreSQL is running:

   ```powershell
   # Windows Service
   Get-Service postgresql*

   # Or check with psql
   psql -U postgres -c "SELECT 1"
   ```

2. Verify credentials in `.env` match your PostgreSQL setup

3. Check if database exists:

   ```powershell
   psql -U postgres -l
   ```

4. Check firewall/port 5432 is accessible

---

### Test 2 Failed (Redis Connection)

**Error:** `Redis connection error`

**Solutions:**

1. Check if Redis is running:

   ```powershell
   # Try connecting
   redis-cli ping
   # Should return: PONG
   ```

2. Start Redis service:

   ```powershell
   # Windows Service (if installed as service)
   Start-Service Redis

   # Or start Redis server manually
   redis-server
   ```

3. Check if port 6379 is accessible

---

### Migrations Failed

**Error:** `relation "users" already exists`

**Solution:** Database tables already exist. You can either:

1. **Drop and recreate database** (WARNING: Deletes all data):

   ```powershell
   psql -U postgres -c "DROP DATABASE user_db;"
   psql -U postgres -c "CREATE DATABASE user_db;"
   npm run migrate
   ```

2. **Skip migrations** if tables are already correct

---

### Token Generation Errors

**Error:** Issues with JWT or password hashing

**Solutions:**

1. Ensure `.env` file has JWT_SECRET and JWT_REFRESH_SECRET set
2. Check that secrets are at least 32 characters long
3. Verify bcrypt is installed: `npm list bcryptjs`

---

## What We've Tested

✅ **Database Layer:**

- Connection pooling
- Table schema creation
- Migration system

✅ **Redis Layer:**

- Connection
- Session storage/retrieval
- Key-value operations

✅ **Authentication:**

- Password hashing (bcrypt)
- Password verification
- JWT access token generation
- JWT refresh token generation
- Token verification
- Password reset token generation

✅ **Security:**

- Strong password requirements
- Secure token generation
- Hash functions

---

## Next Steps

Once all tests pass, you can:

1. **Continue building** - Add controllers, routes, and middleware
2. **Test manually** - Use Postman/Insomnia to test API endpoints
3. **Add unit tests** - Write Jest tests for business logic
4. **Add integration tests** - Test full request/response cycle

---

## Verify Database Tables

You can manually inspect the created tables:

```powershell
# Connect to database
psql -U postgres -d user_db

# List all tables
\dt

# Describe users table
\d users

# View sample data (should be empty)
SELECT * FROM users;

# Exit
\q
```

**Expected tables:**

- users
- refresh_tokens
- user_preferences
- sessions
- audit_logs
- addresses

---

## Clean Up (Optional)

If you want to start fresh:

```powershell
# Stop services
# If using Docker:
docker stop postgres-test redis-test
docker rm postgres-test redis-test

# If using local services:
Stop-Service PostgreSQL*
Stop-Service Redis

# Drop database
psql -U postgres -c "DROP DATABASE user_db;"
```

---

## Success Criteria

Your setup is ready when:

✅ All 7 tests pass
✅ PostgreSQL is connected
✅ Redis is connected
✅ All tables exist
✅ Tokens can be generated and verified
✅ Passwords can be hashed and compared

---

## Need Help?

Common issues and solutions:

1. **Port conflicts:** Change ports in `.env` if 5432 or 6379 are already in use
2. **Permission errors:** Run PowerShell as Administrator
3. **Connection timeouts:** Check firewall settings
4. **Module not found:** Run `npm install` again

---

**Ready to continue?** Once all tests pass, we'll build the Service, Controller, and Route layers! 🚀
