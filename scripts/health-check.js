#!/usr/bin/env node

/**
 * Health Check Script for Blue-Green Deployment
 * Validates service health before traffic switch
 */

const http = require('http');
const https = require('https');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost';
const TIMEOUT = parseInt(process.env.TIMEOUT) || 300000; // 5 minutes
const SERVICES = (
  process.env.SERVICES || 'user-service,product-service,order-service,payment-service'
).split(',');
const INTERVAL = 5000; // Check every 5 seconds

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 10000;

    const req = protocol.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', reject);
  });
}

async function checkServiceHealth(serviceName) {
  const healthUrl = `${TARGET_URL}/api/v1/${serviceName}/health`;

  try {
    const response = await makeRequest(healthUrl);

    if (response.data && response.data.status === 'healthy') {
      return { healthy: true, service: serviceName, data: response.data };
    } else {
      return {
        healthy: false,
        service: serviceName,
        error: 'Service not healthy',
        data: response.data,
      };
    }
  } catch (error) {
    return { healthy: false, service: serviceName, error: error.message };
  }
}

async function checkMetricsEndpoint(serviceName) {
  const metricsUrl = `${TARGET_URL}/api/v1/${serviceName}/metrics`;

  try {
    await makeRequest(metricsUrl);
    return { available: true, service: serviceName };
  } catch (error) {
    return { available: false, service: serviceName, error: error.message };
  }
}

async function checkDatabaseConnectivity() {
  // Check if services can connect to database through health endpoint
  log('Checking database connectivity...', 'blue');

  const checks = await Promise.all(SERVICES.map((service) => checkServiceHealth(service)));

  const dbIssues = checks.filter((check) => {
    return check.data && check.data.database === false;
  });

  if (dbIssues.length > 0) {
    log(
      `⚠️  Database connectivity issues detected in: ${dbIssues.map((i) => i.service).join(', ')}`,
      'yellow'
    );
    return false;
  }

  log('✅ Database connectivity verified', 'green');
  return true;
}

async function performHealthCheck() {
  const startTime = Date.now();
  log(`\n🏥 Starting health check for: ${SERVICES.join(', ')}`, 'blue');
  log(`Target: ${TARGET_URL}`, 'blue');
  log(`Timeout: ${TIMEOUT / 1000}s\n`, 'blue');

  const results = {
    services: {},
    metrics: {},
    database: false,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    success: false,
  };

  let allHealthy = false;
  let attempts = 0;
  const maxAttempts = Math.floor(TIMEOUT / INTERVAL);

  while (!allHealthy && attempts < maxAttempts) {
    attempts++;
    log(`\nAttempt ${attempts}/${maxAttempts}`, 'yellow');

    // Check all services
    const healthChecks = await Promise.all(SERVICES.map((service) => checkServiceHealth(service)));

    const metricsChecks = await Promise.all(
      SERVICES.map((service) => checkMetricsEndpoint(service))
    );

    // Update results
    healthChecks.forEach((check) => {
      results.services[check.service] = check;
      const symbol = check.healthy ? '✅' : '❌';
      const color = check.healthy ? 'green' : 'red';
      const message = check.healthy
        ? `${symbol} ${check.service}: Healthy`
        : `${symbol} ${check.service}: ${check.error}`;
      log(message, color);
    });

    metricsChecks.forEach((check) => {
      results.metrics[check.service] = check;
    });

    // Check if all services are healthy
    allHealthy = healthChecks.every((check) => check.healthy);

    if (allHealthy) {
      log('\n🎉 All services are healthy!', 'green');

      // Perform additional checks
      results.database = await checkDatabaseConnectivity();

      if (!results.database) {
        allHealthy = false;
        log('\n⚠️  Database connectivity check failed', 'red');
      }
    } else {
      const unhealthyServices = healthChecks.filter((c) => !c.healthy).map((c) => c.service);
      log(`\n⏳ Waiting for services: ${unhealthyServices.join(', ')}`, 'yellow');
      await new Promise((resolve) => setTimeout(resolve, INTERVAL));
    }
  }

  results.endTime = new Date().toISOString();
  results.duration = Date.now() - startTime;
  results.success = allHealthy;

  // Final report
  log('\n' + '='.repeat(60), 'blue');
  log('Health Check Summary', 'blue');
  log('='.repeat(60), 'blue');
  log(`Duration: ${(results.duration / 1000).toFixed(2)}s`, 'blue');
  log(`Services checked: ${SERVICES.length}`, 'blue');
  log(`Healthy: ${Object.values(results.services).filter((s) => s.healthy).length}`, 'green');
  log(`Unhealthy: ${Object.values(results.services).filter((s) => !s.healthy).length}`, 'red');
  log(
    `Metrics available: ${Object.values(results.metrics).filter((m) => m.available).length}`,
    'blue'
  );
  log('='.repeat(60), 'blue');

  if (results.success) {
    log('\n✅ Health check PASSED', 'green');
    process.exit(0);
  } else {
    log('\n❌ Health check FAILED', 'red');
    log('\nFailed services:', 'red');
    Object.values(results.services)
      .filter((s) => !s.healthy)
      .forEach((s) => log(`  - ${s.service}: ${s.error}`, 'red'));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n⚠️  Health check interrupted', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  Health check terminated', 'yellow');
  process.exit(1);
});

// Run health check
performHealthCheck().catch((error) => {
  log(`\n❌ Health check error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
