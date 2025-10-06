const logger = require('../src/logger');

// Jest setup file for XACML tests

// Increase default timeout for tests that involve network calls
jest.setTimeout(30000);

// Global test utilities
global.testTimeout = 30000;

// Mock console methods for cleaner test output if needed
if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
  // Uncomment to suppress console.log during tests
  // global.console = {
  //   ...console,
  //   log: jest.fn(),
  //   warn: jest.fn(),
  //   error: jest.fn(),
  // };
}

// Setup for handling async test cleanup
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

logger.info('XACML Test Suite initialized');
logger.info(`AuthzForce URL: ${process.env.AUTHZFORCE_URL || 'http://localhost:8080/authzforce-ce'}`);