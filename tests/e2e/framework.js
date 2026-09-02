/**
 * RahulTube E2E Test Framework & Assertion Core
 */

import http from 'http';
import path from 'path';

// Terminal Color Formatting
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Global Test Registry State
export const state = {
  suites: [],
  currentSuite: null,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  startTime: 0,
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000'
};

/**
 * Define a test suite group
 */
export function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: []
  };
  state.suites.push(suite);
  const previousSuite = state.currentSuite;
  state.currentSuite = suite;
  try {
    fn();
  } finally {
    state.currentSuite = previousSuite;
  }
}

/**
 * Define a single test case
 */
export function test(name, fn) {
  if (!state.currentSuite) {
    describe('Default Suite', () => {
      test(name, fn);
    });
    return;
  }
  state.currentSuite.tests.push({ name, fn, timeout: 15000 });
}

export const it = test;

/**
 * Lifecycle hooks
 */
export function beforeAll(fn) {
  if (state.currentSuite) state.currentSuite.beforeAll.push(fn);
}

export function afterAll(fn) {
  if (state.currentSuite) state.currentSuite.afterAll.push(fn);
}

export function beforeEach(fn) {
  if (state.currentSuite) state.currentSuite.beforeEach.push(fn);
}

export function afterEach(fn) {
  if (state.currentSuite) state.currentSuite.afterEach.push(fn);
}

/**
 * Assertions
 */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    const err = new Error(message);
    Error.captureStackTrace?.(err, assert);
    throw err;
  }
}

export function assertEqual(actual, expected, message) {
  const isMatch = actual === expected || (Number.isNaN(actual) && Number.isNaN(expected));
  if (!isMatch) {
    throw new Error(
      message || `Expected [${JSON.stringify(expected)}] but received [${JSON.stringify(actual)}]`
    );
  }
}

export function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(message || `Expected value not to equal [${JSON.stringify(expected)}]`);
  }
}

export function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      message || `Deep equality mismatch:\nExpected: ${expectedStr}\nActual:   ${actualStr}`
    );
  }
}

export function assertTruthy(val, message) {
  if (!val) {
    throw new Error(message || `Expected truthy value but got [${val}]`);
  }
}

export function assertFalsy(val, message) {
  if (val) {
    throw new Error(message || `Expected falsy value but got [${val}]`);
  }
}

export function assertIncludes(haystack, needle, message) {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      throw new Error(
        message || `Expected string to contain substring:\nNeedle: "${needle}"\nHaystack: "${haystack.slice(0, 150)}..."`
      );
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.includes(needle)) {
      throw new Error(
        message || `Expected array to contain item: [${JSON.stringify(needle)}]`
      );
    }
  } else {
    throw new Error(message || `Cannot check inclusion in type: ${typeof haystack}`);
  }
}

export function assertType(val, type, message) {
  const actualType = typeof val;
  if (actualType !== type) {
    throw new Error(
      message || `Expected type "${type}" but received "${actualType}" (value: ${JSON.stringify(val)})`
    );
  }
}

export function assertMatches(str, regex, message) {
  if (!regex.test(str)) {
    throw new Error(
      message || `Expected "${str}" to match regular expression: ${regex}`
    );
  }
}

export function assertGreaterThan(actual, min, message) {
  if (!(actual > min)) {
    throw new Error(message || `Expected ${actual} to be strictly greater than ${min}`);
  }
}

export function assertGreaterThanOrEqual(actual, min, message) {
  if (!(actual >= min)) {
    throw new Error(message || `Expected ${actual} to be greater than or equal to ${min}`);
  }
}

/**
 * Mock In-Memory localStorage factory for Node.js E2E state tests
 */
export function createMockLocalStorage(initialData = {}) {
  let store = { ...initialData };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] || null,
    _dump: () => ({ ...store })
  };
}

/**
 * HTTP helper for server API requests
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${state.baseUrl}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data
  };
}

/**
 * Verify server liveness
 */
async function checkServerLiveness(retries = 5, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${state.baseUrl}/api/trending?category=All`, { signal: AbortSignal.timeout(4000) });
      if (res.status === 200) {
        return true;
      }
    } catch (e) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  return false;
}

/**
 * Main Runner Execution Logic
 */
export async function run() {
  console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.white}               🚀 RahulTube Comprehensive E2E Test Suite               ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}\n`);

  console.log(`${colors.dim}Target Server URL:${colors.reset} ${colors.bold}${state.baseUrl}${colors.reset}`);
  
  // Verify server is accessible
  process.stdout.write(`${colors.cyan}• Checking server connectivity... ${colors.reset}`);
  const isAlive = await checkServerLiveness(6, 800);
  if (!isAlive) {
    console.log(`${colors.red}FAILED${colors.reset}`);
    console.error(`\n${colors.red}${colors.bold}Error: Unable to connect to server at ${state.baseUrl}.${colors.reset}`);
    console.error(`${colors.yellow}Please ensure the server is running on port 5000 (e.g. 'node server.js').${colors.reset}\n`);
    process.exit(1);
  }
  console.log(`${colors.green}${colors.bold}READY${colors.reset}\n`);

  state.startTime = Date.now();
  const failedTestReports = [];

  for (const suite of state.suites) {
    console.log(`\n${colors.bold}${colors.blue}▶ Suite: ${suite.name}${colors.reset}`);

    // Run beforeAll hooks
    for (const hook of suite.beforeAll) {
      await hook();
    }

    for (const testCase of suite.tests) {
      state.totalTests++;
      const testStart = Date.now();

      // Run beforeEach hooks
      for (const hook of suite.beforeEach) {
        await hook();
      }

      try {
        await testCase.fn();
        const duration = Date.now() - testStart;
        state.passedTests++;
        console.log(`  ${colors.green}✔${colors.reset} ${testCase.name} ${colors.dim}(${duration}ms)${colors.reset}`);
      } catch (err) {
        const duration = Date.now() - testStart;
        state.failedTests++;
        console.log(`  ${colors.red}✖${colors.reset} ${testCase.name} ${colors.dim}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}${err.message}${colors.reset}`);
        failedTestReports.push({
          suite: suite.name,
          test: testCase.name,
          error: err
        });
      }

      // Run afterEach hooks
      for (const hook of suite.afterEach) {
        await hook();
      }
    }

    // Run afterAll hooks
    for (const hook of suite.afterAll) {
      await hook();
    }
  }

  const totalDuration = Date.now() - state.startTime;

  // Print Summary Table
  console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.white}                            SUMMARY REPORT                              ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`Total Test Suites : ${colors.bold}${state.suites.length}${colors.reset}`);
  console.log(`Total Test Cases  : ${colors.bold}${state.totalTests}${colors.reset}`);
  console.log(`Passed            : ${colors.green}${colors.bold}${state.passedTests}${colors.reset}`);
  console.log(`Failed            : ${state.failedTests > 0 ? colors.red + colors.bold + state.failedTests : colors.dim + '0'}${colors.reset}`);
  console.log(`Execution Time    : ${colors.bold}${totalDuration} ms${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}`);

  if (state.failedTests > 0) {
    console.log(`\n${colors.red}${colors.bold}FAILURES (${state.failedTests}):${colors.reset}`);
    failedTestReports.forEach((f, idx) => {
      console.log(`\n${idx + 1}) [${f.suite}] ${f.test}`);
      console.log(`   ${colors.red}${f.error.stack || f.error.message}${colors.reset}`);
    });
    console.log(`\n${colors.bgRed}${colors.white}${colors.bold} TEST SUITE FAILED ${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.bgGreen}${colors.white}${colors.bold} ALL ${state.totalTests} TESTS PASSED SUCCESSFULLY! 🚀 ${colors.reset}\n`);
    process.exit(0);
  }
}
