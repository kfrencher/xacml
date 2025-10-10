import AuthzForceClient from '../src/authzforce-client.js';
import XacmlTestUtils from '../src/test-utils.js';
import logger from '../src/logger.js';

// Test configuration
const testConfig = XacmlTestUtils.createTestSuite({
  name: 'Role-Based Access Control Tests',
  authzForceUrl: process.env.AUTHZFORCE_URL || 'http://localhost:8080/authzforce-ce',
  timeout: 30000
});

describe(testConfig.name, () => {
  /** @type {AuthzForceClient} */
  let client;
  /** @type {string} */
  let domainId;
  const createdDomains = [];

  beforeAll(async () => {
    // Initialize AuthzForce client
    client = new AuthzForceClient(testConfig.authzForceUrl);
    
    // Wait for AuthzForce to be ready
    const isHealthy = await XacmlTestUtils.waitForCondition(
      () => client.healthCheck(),
      testConfig.setupTimeout,
      2000
    );
    
    if (!isHealthy) {
      throw new Error(`AuthzForce server not available at ${testConfig.authzForceUrl}`);
    }
    
    logger.debug('AuthzForce server is ready');
  }, testConfig.setupTimeout);

  beforeEach(async () => {
    // Create a new domain for each test
    domainId = XacmlTestUtils.generateDomainId('rbac-test');
    domainId = await client.createDomain(domainId);
    logger.debug(`Created domain: ${domainId}`);
    createdDomains.push(domainId);
    
    // Load and deploy the role-based policy
    const policyXml = await XacmlTestUtils.loadPolicy('./policies/role-based-policy.xml');
    const policyId = XacmlTestUtils.extractPolicyId(policyXml);
    if(policyId) {
      const version = await client.addPolicy(domainId, policyXml, policyId);
      await client.setActivePolicy(domainId, policyId);
    } else {
      throw new Error('Failed to extract policy ID from the role-based policy XML');
    }
  });

  afterAll(async () => {
    // Clean up all created domains
    if (client && createdDomains.length > 0) {
      await XacmlTestUtils.cleanupDomains(client, createdDomains);
    }
  });

  describe('Administrator Access', () => {
    test('Admin can read documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'admin1', role: 'admin' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'Admin should be able to read documents');
    });

    test('Admin can update documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'admin1', role: 'admin' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'update' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'Admin should be able to update documents');
    });

    test('Admin can delete documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'admin1', role: 'admin' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'delete' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'Admin should be able to delete documents');
    });
  });

  describe('Manager Access', () => {
    test('Manager can read documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'manager1', role: 'manager' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'Manager should be able to read documents');
    });

    test('Manager can update documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'manager1', role: 'manager' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'update' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'Manager should be able to update documents');
    });

    test('Manager cannot delete documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'manager1', role: 'manager' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'delete' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'Manager should not be able to delete documents');
    });
  });

  describe('User Access', () => {
    test('User can read documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'user1', role: 'user' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'User should be able to read documents');
    });

    test('User cannot update documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'user1', role: 'user' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'update' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'User should not be able to update documents');
    });

    test('User cannot delete documents', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'user1', role: 'user' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'delete' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'User should not be able to delete documents');
    });
  });

  describe('Edge Cases', () => {
    test('Unknown role denied access', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'unknown1', role: 'guest' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'User with unknown role should be denied access');
    });

    test('Missing role denied access', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'norole1' },
        resource: { 'resource-id': 'doc123', type: 'document' },
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'User without role should be denied access');
    });
  });
});