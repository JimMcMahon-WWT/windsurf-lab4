import * as dotenv from 'dotenv';
import { testConnection, closePool, pool } from '../src/config/database.config';
import { testRedisConnection, closeRedis, setSession, getSession } from '../src/config/redis.config';
import authUtils from '../src/utils/auth.utils';
import { UserRole } from '../src/types/user.types';

// Load environment variables
dotenv.config();

async function testSetup() {
  console.log('🧪 Testing User Service Setup\n');
  console.log('═'.repeat(60));

  let allTestsPassed = true;

  try {
    // Test 1: Database Connection
    console.log('\n📦 Test 1: PostgreSQL Connection');
    console.log('─'.repeat(60));
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✅ PostgreSQL connection successful');
    } else {
      console.log('❌ PostgreSQL connection failed');
      allTestsPassed = false;
    }

    // Test 2: Redis Connection
    console.log('\n📦 Test 2: Redis Connection');
    console.log('─'.repeat(60));
    const redisConnected = await testRedisConnection();
    if (redisConnected) {
      console.log('✅ Redis connection successful');
    } else {
      console.log('❌ Redis connection failed');
      allTestsPassed = false;
    }

    // Test 3: Redis Session Operations
    if (redisConnected) {
      console.log('\n📦 Test 3: Redis Session Operations');
      console.log('─'.repeat(60));
      try {
        const testUserId = 'test-user-123';
        const testToken = 'test-token-456';
        const testData = { userId: testUserId, email: 'test@example.com' };

        await setSession(testUserId, testToken, testData);
        console.log('✅ Session set successfully');

        const retrieved = await getSession(testUserId, testToken);
        if (retrieved && retrieved.userId === testUserId) {
          console.log('✅ Session retrieved successfully');
        } else {
          console.log('❌ Session retrieval failed');
          allTestsPassed = false;
        }
      } catch (error) {
        console.log('❌ Redis session operations failed:', error);
        allTestsPassed = false;
      }
    }

    // Test 4: Password Hashing
    console.log('\n📦 Test 4: Password Hashing & Verification');
    console.log('─'.repeat(60));
    try {
      const password = 'TestPassword123';
      const hash = await authUtils.hashPassword(password);
      console.log('✅ Password hashed successfully');

      const isValid = await authUtils.comparePassword(password, hash);
      if (isValid) {
        console.log('✅ Password verification successful');
      } else {
        console.log('❌ Password verification failed');
        allTestsPassed = false;
      }

      const isInvalid = await authUtils.comparePassword('WrongPassword', hash);
      if (!isInvalid) {
        console.log('✅ Wrong password correctly rejected');
      } else {
        console.log('❌ Wrong password incorrectly accepted');
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Password hashing test failed:', error);
      allTestsPassed = false;
    }

    // Test 5: JWT Token Generation & Verification
    console.log('\n📦 Test 5: JWT Token Operations');
    console.log('─'.repeat(60));
    try {
      const payload = {
        userId: 'test-123',
        email: 'test@example.com',
        role: UserRole.CUSTOMER
      };

      const accessToken = authUtils.generateAccessToken(payload);
      console.log('✅ Access token generated');

      const verified = authUtils.verifyAccessToken(accessToken);
      if (verified.userId === payload.userId) {
        console.log('✅ Access token verified successfully');
      } else {
        console.log('❌ Access token verification failed');
        allTestsPassed = false;
      }

      const refreshPayload = { userId: 'test-123', tokenId: 'token-456' };
      const refreshToken = authUtils.generateRefreshToken(refreshPayload);
      console.log('✅ Refresh token generated');

      const verifiedRefresh = authUtils.verifyRefreshToken(refreshToken);
      if (verifiedRefresh.userId === refreshPayload.userId) {
        console.log('✅ Refresh token verified successfully');
      } else {
        console.log('❌ Refresh token verification failed');
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ JWT token test failed:', error);
      allTestsPassed = false;
    }

    // Test 6: Reset Token Generation
    console.log('\n📦 Test 6: Password Reset Token');
    console.log('─'.repeat(60));
    try {
      const resetToken = authUtils.generateResetToken();
      if (resetToken && resetToken.length > 0) {
        console.log('✅ Reset token generated:', resetToken.substring(0, 16) + '...');
      } else {
        console.log('❌ Reset token generation failed');
        allTestsPassed = false;
      }

      const hashed = authUtils.hashResetToken(resetToken);
      if (hashed && hashed.length > 0) {
        console.log('✅ Reset token hashed successfully');
      } else {
        console.log('❌ Reset token hashing failed');
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Reset token test failed:', error);
      allTestsPassed = false;
    }

    // Test 7: Database Table Check
    if (dbConnected) {
      console.log('\n📦 Test 7: Database Tables');
      console.log('─'.repeat(60));
      try {
        const tables = [
          'users',
          'refresh_tokens',
          'user_preferences',
          'sessions',
          'audit_logs',
          'addresses'
        ];

        for (const table of tables) {
          const result = await pool.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            )`,
            [table]
          );
          
          if (result.rows[0].exists) {
            console.log(`✅ Table '${table}' exists`);
          } else {
            console.log(`❌ Table '${table}' does not exist`);
            allTestsPassed = false;
          }
        }
      } catch (error) {
        console.log('❌ Database table check failed:', error);
        allTestsPassed = false;
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    if (allTestsPassed) {
      console.log('🎉 All tests passed! Setup is complete.');
      console.log('\n✨ You can now continue building the service.');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
      console.log('\n💡 Make sure:');
      console.log('   1. PostgreSQL is running and accessible');
      console.log('   2. Redis is running and accessible');
      console.log('   3. Database migrations have been run');
      console.log('   4. .env file is configured correctly');
    }
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    allTestsPassed = false;
  } finally {
    // Cleanup
    await closePool();
    await closeRedis();
  }

  process.exit(allTestsPassed ? 0 : 1);
}

testSetup();
