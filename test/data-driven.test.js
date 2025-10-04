const AuthzForceClient = require('../src/authzforce-client');
const XacmlTestUtils = require('../src/test-utils');

describe('Data-Driven XACML Tests', () => {
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

  describe('Role-Based Policy Tests from JSON', () => {
    beforeEach(async () => {
      domainId = XacmlTestUtils.generateDomainId('data-driven');
      domainId = await client.createDomain(domainId);
      createdDomains.push(domainId);
      
      const policyXml = await XacmlTestUtils.loadPolicy('./policies/role-based-policy.xml');
      const policyId = XacmlTestUtils.extractPolicyId(policyXml);
      const version = await client.addPolicy(domainId, policyXml, policyId);
      await client.setActivePolicy(domainId, policyId, version);
    });

    test('Execute all test cases from JSON file', async () => {
      const testCases = await XacmlTestUtils.generateTestCases('./test-data/role-based-tests.json');
      
      for (const testCase of testCases) {
        console.log(`Running test case: ${testCase.name}`);
        
        const result = await client.evaluateRequest(domainId, testCase.request);
        
        XacmlTestUtils.assertDecision(
          result,
          testCase.expected,
          `Test case: ${testCase.name}`
        );
      }
    });
  });

  describe('Individual Test Cases from JSON', () => {
    let testCases;
    
    beforeAll(async () => {
      testCases = await XacmlTestUtils.generateTestCases('./test-data/role-based-tests.json');
    });

    beforeEach(async () => {
      domainId = XacmlTestUtils.generateDomainId('individual');
      domainId = await client.createDomain(domainId);
      createdDomains.push(domainId);
      
      const policyXml = await XacmlTestUtils.loadPolicy('./policies/role-based-policy.xml');
      const policyId = XacmlTestUtils.extractPolicyId(policyXml);
      const version = await client.addPolicy(domainId, policyXml, policyId);
      await client.setActivePolicy(domainId, policyId, version);
    });

    // Dynamically create tests from JSON data
    test.each(
      testCases || []
    )('$name', async (/** @type {import('../src/test-utils').TestCase} */ testCase) => {
      const result = await client.evaluateRequest(domainId, testCase.request);
      XacmlTestUtils.assertDecision(result, testCase.expected, testCase.description);
    });
  });
});