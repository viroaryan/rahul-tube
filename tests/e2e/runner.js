/**
 * RahulTube Standalone E2E Test Suite Runner
 * 
 * Execution Command: node tests/e2e/runner.js
 */

import { run } from './framework.js';

// Re-export all framework utilities for external consumers
export * from './framework.js';

// Load all 5 test tiers
import './tier1_features.test.js';
import './tier2_boundaries.test.js';
import './tier3_pairwise.test.js';
import './tier4_scenarios.test.js';
import './tier5_adversarial.test.js';

// Execute suite
try {
  await run();
} catch (err) {
  console.error('\nFatal error executing test runner:', err);
  process.exit(1);
}
