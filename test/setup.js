import logger from '../src/logger.js';

// Jest setup file for XACML tests

// Increase default timeout for tests that involve network calls
jest.setTimeout(30000);

// Global test utilities
global.testTimeout = 30000;

// Setup for handling async test cleanup
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

logger.info('XACML Test Suite initialized');
logger.info(`AuthzForce URL: ${process.env.AUTHZFORCE_URL || 'http://127.0.0.1:8080/authzforce-ce'}`);