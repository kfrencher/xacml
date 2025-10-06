import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';
import AuthzForceClient from './authzforce-client';

/**
 * @typedef {import('./authzforce-client').XacmlRequest} XacmlRequest
 * @typedef {import('./authzforce-client').XacmlDecisionResponse} XacmlDecisionResponse
 * @typedef {import('./authzforce-client').XacmlSubject} XacmlSubject
 * @typedef {import('./authzforce-client').XacmlResource} XacmlResource
 * @typedef {import('./authzforce-client').XacmlAction} XacmlAction
 * @typedef {import('./authzforce-client').XacmlEnvironment} XacmlEnvironment
 */

/**
 * @typedef {Object} TestCaseRequest
 * @property {Partial<XacmlSubject>} [subject] - Subject attributes
 * @property {Partial<XacmlResource>} [resource] - Resource attributes
 * @property {Partial<XacmlAction>} [action] - Action attributes
 * @property {Partial<XacmlEnvironment>} [environment] - Environment attributes
 */

/**
 * @typedef {Object} ExpectedDecision
 * @property {'Permit'|'Deny'|'Indeterminate'|'NotApplicable'} decision - Expected decision
 * @property {string} [status] - Expected status code
 * @property {Array} [obligations] - Expected obligations
 * @property {Array} [advice] - Expected advice
 */

/**
 * @typedef {Object} TestCase
 * @property {string} name - Test case name
 * @property {string} [description] - Test case description
 * @property {TestCaseRequest} request - XACML request specification
 * @property {ExpectedDecision} expected - Expected decision result
 * @property {Function|null} [setup] - Setup function
 * @property {Function|null} [teardown] - Teardown function
 */

/**
 * @typedef {Object} TestData
 * @property {string} [testSuite] - Test suite name
 * @property {string} [description] - Test suite description
 * @property {string} [policy] - Policy file name
 * @property {Array<TestCase>} testCases - Array of test cases
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the policy XML is valid
 * @property {Array<string>} errors - Validation errors
 * @property {Array<string>} warnings - Validation warnings
 */

/**
 * @typedef {Object} TestSuiteConfig
 * @property {string} name - Test suite name
 * @property {string} authzForceUrl - AuthzForce server URL
 * @property {number} timeout - Test timeout in milliseconds
 * @property {number} retries - Number of retries for failed tests
 * @property {boolean} parallel - Whether to run tests in parallel
 * @property {number} setupTimeout - Setup timeout in milliseconds
 */

/**
 * Test utilities for XACML policy testing
 */
class XacmlTestUtils {
  /**
   * Load XACML policy from file
   * @param {string} policyPath - Path to policy file (relative or absolute)
   * @returns {Promise<string>} Policy XML content
   * @throws {Error} When file cannot be read or doesn't exist
   */
  static async loadPolicy(policyPath) {
    try {
      const fullPath = path.resolve(policyPath);
      return await fs.readFile(fullPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load policy from ${policyPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load test data from JSON file
   * @param {string} dataPath - Path to test data file (relative or absolute)
   * @returns {Promise<TestData>} Test data object
   * @throws {Error} When file cannot be read, doesn't exist, or contains invalid JSON
   */
  static async loadTestData(dataPath) {
    try {
      const fullPath = path.resolve(dataPath);
      const content = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load test data from ${dataPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create standardized XACML request object
   * @param {TestCaseRequest} [options={}] - Request options
   * @returns {XacmlRequest} XACML request object with defaults applied
   */
  static createRequest({
    subject = {},
    resource = {},
    action = {},
    environment = {}
  } = {}) {
    return {
      subject: {
        id: subject.id || 'anonymous',
        role: subject.role || '',
        ...subject
      },
      resource: {
        id: resource.id || 'default-resource',
        type: resource.type || 'document',
        ...resource
      },
      action: {
        id: action.id || 'read',
        ...action
      },
      environment: {
        currentTime: environment.currentTime || new Date().toISOString(),
        ...environment
      }
    };
  }

  /**
   * Assert decision matches expected result
   * @param {XacmlDecisionResponse} actual - Actual decision response
   * @param {ExpectedDecision} expected - Expected decision
   * @param {string} [message=''] - Optional assertion message
   * @throws {Error} When assertion fails (via Jest expect)
   */
  static assertDecision(actual, expected, message = '') {
    const prefix = message ? `${message}: ` : '';
    
    expect(actual.decision).toBe(expected.decision);
    
    if (expected.status) {
      expect(actual.status).toBe(expected.status);
    }
    
    if (expected.obligations) {
      expect(actual.obligations).toEqual(expect.arrayContaining(expected.obligations));
    }
    
    if (expected.advice) {
      expect(actual.advice).toEqual(expect.arrayContaining(expected.advice));
    }
  }

  /**
   * Generate test cases from test data file
   * @param {string} testDataPath - Path to test data file
   * @returns {Promise<Array<TestCase>>} Array of test cases with normalized structure
   * @throws {Error} When file cannot be loaded or doesn't contain testCases array
   */
  static async generateTestCases(testDataPath) {
    const testData = await this.loadTestData(testDataPath);
    
    if (!testData.testCases || !Array.isArray(testData.testCases)) {
      throw new Error('Test data must contain a testCases array');
    }
    
    return testData.testCases.map(testCase => ({
      name: testCase.name || 'Unnamed test case',
      description: testCase.description || '',
      request: this.createRequest(testCase.request || {}),
      expected: testCase.expected || { decision: 'Permit' },
      setup: testCase.setup || null,
      teardown: testCase.teardown || null
    }));
  }

  /**
   * Wait for condition with timeout
   * @param {() => Promise<boolean> | boolean} condition - Function that returns boolean or Promise<boolean>
   * @param {number} [timeout=30000] - Timeout in milliseconds
   * @param {number} [interval=1000] - Check interval in milliseconds
   * @returns {Promise<boolean>} True if condition met within timeout, false otherwise
   */
  static async waitForCondition(condition, timeout = 30000, interval = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
  }

  /**
   * Generate unique domain ID for testing
   * @param {string} [prefix='test'] - Optional prefix for the domain ID
   * @returns {string} Unique domain ID in format: {prefix}-{timestamp}-{random}
   */
  static generateDomainId(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Cleanup test domains (for use in test teardown)
   * @param {AuthzForceClient} client - AuthzForce client instance
   * @param {Array<string>} domainIds - Array of domain IDs to cleanup
   * @returns {Promise<void>} Promise that resolves when all cleanup attempts complete
   */
  static async cleanupDomains(client, domainIds) {
    const cleanupPromises = domainIds.map(async (domainId) => {
      try {
        await client.deleteDomain(domainId);
      } catch (error) {
        // Log but don't fail test cleanup
        logger.warn(`Failed to cleanup domain ${domainId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    await Promise.all(cleanupPromises);
  }

  /**
   * Validate XACML policy XML structure
   * @param {string} policyXml - XACML policy XML string
   * @returns {ValidationResult} Validation result with errors and warnings
   */
  static validatePolicyXml(policyXml) {
    /** @type {ValidationResult} */
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Basic XML structure checks
    if (!policyXml.includes('<Policy') && !policyXml.includes('<PolicySet')) {
      validation.isValid = false;
      validation.errors.push('Missing Policy or PolicySet root element');
    }

    if (!policyXml.includes('xmlns')) {
      validation.warnings.push('Missing XML namespace declaration');
    }

    if (!policyXml.includes('PolicyId')) {
      validation.isValid = false;
      validation.errors.push('Missing PolicyId attribute');
    }

    return validation;
  }

  /**
   * Extract policy ID from XACML policy XML
   * @param {string} policyXml - XACML policy XML string
   * @returns {string|null} Policy ID or null if not found
   */
  static extractPolicyId(policyXml) {
    // First try to extract PolicySetId
    const policySetIdMatch = policyXml.match(/PolicySetId="([^"]+)"/);
    if (policySetIdMatch) {
      return policySetIdMatch[1];
    }
    
    // Fallback to PolicyId for individual policies
    const policyIdMatch = policyXml.match(/PolicyId="([^"]+)"/);
    return policyIdMatch ? policyIdMatch[1] : null;
  }

  /**
   * Create a test suite configuration
   * @param {Partial<TestSuiteConfig>} [config={}] - Test suite configuration options
   * @returns {TestSuiteConfig} Normalized configuration with defaults applied
   */
  static createTestSuite({
    name = 'XACML Policy Test Suite',
    authzForceUrl = 'http://localhost:8080/authzforce-ce',
    timeout = 30000,
    retries = 1,
    parallel = false,
    setupTimeout = 60000
  } = {}) {
    return {
      name,
      authzForceUrl,
      timeout,
      retries,
      parallel,
      setupTimeout
    };
  }
}

export default XacmlTestUtils;