#!/usr/bin/env node

/**
 * Canary Deployment Monitor
 * Monitors metrics during canary deployment
 */

const https = require('https');

const DURATION = parseInt(process.env.DURATION) || 180; // 3 minutes
const ERROR_THRESHOLD = parseFloat(process.env.ERROR_THRESHOLD) || 1; // 1% error rate
const LATENCY_THRESHOLD = parseInt(process.env.LATENCY_THRESHOLD) || 500; // 500ms P95
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

function promQuery(query) {
  return new Promise((resolve, reject) => {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === 'success') {
            resolve(result.data.result);
          } else {
            reject(new Error(`Prometheus query failed: ${result.error}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function getErrorRate() {
  const query = `
    sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
    sum(rate(http_requests_total[5m])) * 100
  `;
  
  const result = await promQuery(query);
  if (result.length > 0) {
    return parseFloat(result[0].value[1]);
  }
  return 0;
}

async function getP95Latency() {
  const query = `
    histogram_quantile(0.95, 
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
    ) * 1000
  `;
  
  const result = await promQuery(query);
  if (result.length > 0) {
    return parseFloat(result[0].value[1]);
  }
  return 0;
}

async function getRequestRate() {
  const query = 'sum(rate(http_requests_total[1m]))';
  const result = await promQuery(query);
  if (result.length > 0) {
    return parseFloat(result[0].value[1]);
  }
  return 0;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '  ℹ️',
    success: '  ✅',
    warning: '  ⚠️ ',
    error: '  ❌',
  }[type] || '  ℹ️';
  
  console.log(`${timestamp} ${prefix} ${message}`);
}

async function monitorCanary() {
  log(`Starting canary monitoring for ${DURATION}s`, 'info');
  log(`Error threshold: ${ERROR_THRESHOLD}%`, 'info');
  log(`Latency threshold: ${LATENCY_THRESHOLD}ms`, 'info');
  
  const startTime = Date.now();
  const endTime = startTime + (DURATION * 1000);
  const checkInterval = 10000; // Check every 10 seconds
  
  let checks = 0;
  let failures = 0;
  
  while (Date.now() < endTime) {
    checks++;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      const [errorRate, p95Latency, requestRate] = await Promise.all([
        getErrorRate(),
        getP95Latency(),
        getRequestRate(),
      ]);
      
      log(`[${elapsed}s] Error Rate: ${errorRate.toFixed(2)}% | P95 Latency: ${p95Latency.toFixed(0)}ms | Req/s: ${requestRate.toFixed(2)}`, 'info');
      
      // Check thresholds
      if (errorRate > ERROR_THRESHOLD) {
        failures++;
        log(`Error rate ${errorRate.toFixed(2)}% exceeds threshold ${ERROR_THRESHOLD}%`, 'error');
        
        if (failures >= 3) {
          log('Too many consecutive failures detected', 'error');
          process.exit(1);
        }
      } else if (p95Latency > LATENCY_THRESHOLD) {
        failures++;
        log(`P95 latency ${p95Latency.toFixed(0)}ms exceeds threshold ${LATENCY_THRESHOLD}ms`, 'warning');
        
        if (failures >= 3) {
          log('Too many consecutive latency violations', 'error');
          process.exit(1);
        }
      } else {
        // Reset failure counter on success
        if (failures > 0) {
          log('Metrics recovered', 'success');
          failures = 0;
        }
      }
      
    } catch (error) {
      log(`Error checking metrics: ${error.message}`, 'error');
      failures++;
      
      if (failures >= 5) {
        log('Too many metric collection failures', 'error');
        process.exit(1);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  log(`Canary monitoring completed successfully (${checks} checks)`, 'success');
  log('All metrics within acceptable thresholds', 'success');
  process.exit(0);
}

// Run monitoring
monitorCanary().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
