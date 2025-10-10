import AuthzForceClient from '../src/authzforce-client.js';
import XacmlTestUtils from '../src/test-utils.js';
import logger from '../src/logger.js';

/**
 * 
 * @param {string} filePath 
 * @param {string} domainId
 * @param {AuthzForceClient} client
 * @returns {Promise<{version: string, policyId: string}>}
 */
async function loadPolicy(client, domainId, filePath) {
      const policyXml = await XacmlTestUtils.loadPolicy(filePath);
      const policyId = XacmlTestUtils.extractPolicyId(policyXml);
      if(!policyId) {
        throw new Error('Failed to extract policy ID from the role-based policy XML');
      }
      const version = await client.addPolicy(domainId, policyXml, policyId);
      return {version, policyId };
}

describe('System-a', () => {
  /** @type {AuthzForceClient} */
  let client;
  let domainId;
  const createdDomains = [];

  beforeAll(async () => {
    client = new AuthzForceClient();
    
    const isHealthy = await XacmlTestUtils.waitForCondition(
      () => client.healthCheck(),
      60000,
      2000
    );
    
    if (!isHealthy) {
      throw new Error('AuthzForce server not available');
    }
  }, 60000);

  afterAll(async () => {
    if (client && createdDomains.length > 0) {
      await XacmlTestUtils.cleanupDomains(client, createdDomains);
    }
  });

  describe('System a policy tests', () => {
    beforeEach(async () => {
      domainId = XacmlTestUtils.generateDomainId('system-a');
      domainId = await client.createDomain(domainId);
      createdDomains.push(domainId);
      
      // await loadPolicy(client, domainId, './policies/system-a-ps_ds-person-ps.xml');
      // const { policyId } = await loadPolicy(client, domainId, './policies/system-a-ps.xml');
      await loadPolicy(client, domainId, './build/system_a.groupdataset.xml');
      await loadPolicy(client, domainId, './build/system_a.persondataset.xml');
      const {policyId} = await loadPolicy(client, domainId, './build/system_a.root.xml');
      await client.setActivePolicy(domainId, policyId);
    });

    test('system-a should be able to read person datasource', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resource: { 'resource-id': 'urn:klf:ds:person' },
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'system-a should be able to read person datasource');
    });

    test('system-a should not be able to write person datasource', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resource: { 'resource-id': 'urn:klf:ds:person' },
        action: { 'action-id': 'write' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'system-a should not be able to write person datasource');
    });

    test('system-a should be able to read person.name field', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resources: [
          { 'resource-id': 'urn:klf:ds:person' },
          { 'resource-id': 'urn:klf:ds:field:person.name' }
        ],
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'system-a should be able to read person.name field');
    });

    test('system-a should be able to read person.dob field', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resources: [
          { 'resource-id': 'urn:klf:ds:person' },
          { 'resource-id': 'urn:klf:ds:field:person.dob' }
        ],
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'system-a should be able to read person.name field');
    });

    test('system-a should be able to read person.dob and person.name field', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resources: [
          { 'resource-id': 'urn:klf:ds:person' },
          { 'resource-id': 'urn:klf:ds:field:person.name' },
          { 'resource-id': 'urn:klf:ds:field:person.dob' }
        ],
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Permit'
      }, 'system-a should be able to read person.name and person.dob field');
    });

    test('system-a should not be able to read person.dob and person.name and person.ssn field', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resources: [
          { 'resource-id': 'urn:klf:ds:person' },
          { 'resource-id': 'urn:klf:ds:field:person.name' },
          { 'resource-id': 'urn:klf:ds:field:person.dob' },
          { 'resource-id': 'urn:klf:ds:field:person.ssn' }
        ],
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'system-a should not be able to read person.dob and person.name and person.ssn field');
    });


    test('system-a should not be able to read person.ssn field', async () => {
      const request = XacmlTestUtils.createRequest({
        subject: { 'subject-id': 'system-a', role: '' },
        resources: [
          { 'resource-id': 'urn:klf:ds:person' },
          { 'resource-id': 'urn:klf:ds:field:person.ssn' }
        ],
        action: { 'action-id': 'read' }
      });

      const result = await client.evaluateRequest(domainId, request);
      
      XacmlTestUtils.assertDecision(result, {
        decision: 'Deny'
      }, 'system-a should not be able to read person.ssn field');
    });
  });
});