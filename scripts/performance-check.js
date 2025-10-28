#!/usr/bin/env node

/**
 * Performance Baseline Check
 * Compares current performance against baseline
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const BASELINE_FILE = process.env.BASELINE_FILE || './performance-baselines/production.json';
const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 10;
const DURATION = parseInt(process.env.DURATION) || 30; // seconds
const THRESHOLD_DEVIATION = parseFloat(process.env.THRESHOLD_DEVIATION) || 20; // 20% degradation allowed

const endpoints = [
  { path: '/api/v1/users/health', method: 'GET', name: 'User Health' },
  { path: '/api/v1/products/health', method: 'GET', name: 'Product Health' },
  { path: '/api/v1/orders/health', method: 'GET', name: 'Order Health' },
  { path: '/api/v1/payments/health', method: 'GET', name: 'Payment Health' },
];

function log(message, type = 'info') {
  const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[type] || 'ℹ️';
  console.log(`${emoji} ${message}`);
}

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();

    const req = protocol.request(url, { method }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runLoadTest(endpoint, durationSec, concurrency) {
  const url = `${TARGET_URL}${endpoint.path}`;
  const results = {
    requests: 0,
    successes: 0,
    failures: 0,
    durations: [],
    errors: [],
  };

  const endTime = Date.now() + durationSec * 1000;
  const workers = [];

  // Start concurrent workers
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endTime) {
          try {
            const result = await makeRequest(url, endpoint.method);
            results.requests++;
            results.durations.push(result.duration);

            if (result.success) {
              results.successes++;
            } else {
              results.failures++;
            }
          } catch (error) {
            results.failures++;
            results.errors.push(error.message);
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  // Calculate statistics
  results.durations.sort((a, b) => a - b);
  const len = results.durations.length;

  return {
    endpoint: endpoint.name,
    totalRequests: results.requests,
    successRate: ((results.successes / results.requests) * 100).toFixed(2),
    failureRate: ((results.failures / results.requests) * 100).toFixed(2),
    rps: (results.requests / durationSec).toFixed(2),
    latency: {
      min: results.durations[0] || 0,
      max: results.durations[len - 1] || 0,
      mean: (results.durations.reduce((a, b) => a + b, 0) / len).toFixed(2),
      p50: results.durations[Math.floor(len * 0.5)] || 0,
      p95: results.durations[Math.floor(len * 0.95)] || 0,
      p99: results.durations[Math.floor(len * 0.99)] || 0,
    },
  };
}

function loadBaseline() {
  try {
    if (fs.existsSync(BASELINE_FILE)) {
      const data = fs.readFileSync(BASELINE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    log(`Warning: Could not load baseline: ${error.message}`, 'warning');
  }
  return null;
}

function compareWithBaseline(current, baseline) {
  if (!baseline) {
    log('No baseline found - this will become the new baseline', 'warning');
    return { pass: true, deviations: [] };
  }

  const deviations = [];

  for (const endpoint of current.endpoints) {
    const baselineEndpoint = baseline.endpoints.find((e) => e.endpoint === endpoint.endpoint);
    if (!baselineEndpoint) continue;

    // Compare P95 latency
    const p95Deviation =
      ((endpoint.latency.p95 - baselineEndpoint.latency.p95) / baselineEndpoint.latency.p95) * 100;

    // Compare success rate
    const successRateDeviation =
      parseFloat(baselineEndpoint.successRate) - parseFloat(endpoint.successRate);

    if (p95Deviation > THRESHOLD_DEVIATION) {
      deviations.push({
        endpoint: endpoint.endpoint,
        metric: 'P95 Latency',
        baseline: baselineEndpoint.latency.p95,
        current: endpoint.latency.p95,
        deviation: p95Deviation.toFixed(2),
      });
    }

    if (successRateDeviation > 1) {
      deviations.push({
        endpoint: endpoint.endpoint,
        metric: 'Success Rate',
        baseline: baselineEndpoint.successRate,
        current: endpoint.successRate,
        deviation: successRateDeviation.toFixed(2),
      });
    }
  }

  return {
    pass: deviations.length === 0,
    deviations,
  };
}

async function runPerformanceCheck() {
  log(`🚀 Starting performance check`);
  log(`Target: ${TARGET_URL}`);
  log(`Duration: ${DURATION}s per endpoint`);
  log(`Concurrency: ${CONCURRENCY}`);
  log(`Threshold: ${THRESHOLD_DEVIATION}% degradation\n`);

  const results = {
    timestamp: new Date().toISOString(),
    target: TARGET_URL,
    duration: DURATION,
    concurrency: CONCURRENCY,
    endpoints: [],
  };

  // Run load tests for each endpoint
  for (const endpoint of endpoints) {
    log(`Testing ${endpoint.name}...`);
    const result = await runLoadTest(endpoint, DURATION, CONCURRENCY);
    results.endpoints.push(result);

    log(`  Requests: ${result.totalRequests}`);
    log(`  RPS: ${result.rps}`);
    log(`  Success Rate: ${result.successRate}%`);
    log(`  P95 Latency: ${result.latency.p95}ms`);
    log(`  P99 Latency: ${result.latency.p99}ms\n`);
  }

  // Load and compare with baseline
  const baseline = loadBaseline();
  const comparison = compareWithBaseline(results, baseline);

  // Print results
  console.log('='.repeat(60));
  console.log('Performance Check Results');
  console.log('='.repeat(60));

  if (comparison.pass) {
    log('✅ All performance metrics within acceptable range', 'success');
  } else {
    log('❌ Performance degradation detected:', 'error');
    for (const dev of comparison.deviations) {
      log(`  ${dev.endpoint} - ${dev.metric}:`, 'error');
      log(`    Baseline: ${dev.baseline}`, 'error');
      log(`    Current: ${dev.current}`, 'error');
      log(`    Deviation: ${dev.deviation}%`, 'error');
    }
  }

  console.log('='.repeat(60));

  // Save results as new baseline if better or no baseline exists
  if (!baseline || comparison.pass) {
    try {
      const dir = BASELINE_FILE.substring(0, BASELINE_FILE.lastIndexOf('/'));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(results, null, 2));
      log(`Baseline updated: ${BASELINE_FILE}`, 'success');
    } catch (error) {
      log(`Warning: Could not save baseline: ${error.message}`, 'warning');
    }
  }

  process.exit(comparison.pass ? 0 : 1);
}

// Run performance check
runPerformanceCheck().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
