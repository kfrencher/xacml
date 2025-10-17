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
    if (!policyId) {
        throw new Error('Failed to extract policy ID from the role-based policy XML');
    }
    const version = await client.addPolicy(domainId, policyXml, policyId);
    return { version, policyId };
}

describe('System-a', () => {
    /** @type {AuthzForceClient} */
    let client;
    let domainId;
    const createdDomains = [];

    beforeAll(async () => {
        client = new AuthzForceClient();

        const isHealthy = await XacmlTestUtils.waitForCondition(() => client.healthCheck(), 5000, 2000);

        if (!isHealthy) {
            throw new Error('AuthzForce server not available');
        }
    }, 6000);

    afterAll(async () => {
        if (client && createdDomains.length > 0) {
            await XacmlTestUtils.cleanupDomains(client, createdDomains);
        }
    });

    describe('dataset policy tests', () => {
        beforeEach(async () => {
            domainId = XacmlTestUtils.generateDomainId('system-a');
            logger.debug(`Creating domain: ${domainId}`);
            domainId = await client.createDomain(domainId);
            if(!domainId) {
                throw new Error('Failed to create domain for system-a tests');
            }
            logger.debug(`Created domain: ${domainId}`);
            createdDomains.push(domainId);

            // await loadPolicy(client, domainId, './policies/system-a-ps_ds-person-ps.xml');
            // const { policyId } = await loadPolicy(client, domainId, './policies/system-a-ps.xml');
            await loadPolicy(client, domainId, './build/system_a.groupdataset.xml');
            await loadPolicy(client, domainId, './build/system_a.persondataset.xml');
            const { policyId } = await loadPolicy(client, domainId, './build/system_a.root.xml');
            await client.setActivePolicy(domainId, policyId);
        });

        describe('groupdataset', () => {
            test('system-a should be able to read group datasource', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resource: { 'resource-id': 'urn:klf:ds:group' },
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Permit',
                    },
                    'system-a should be able to read person datasource'
                );
            });

            test('system-a should not be able to read person fields from group datasource', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                      { 'resource-id': 'urn:klf:ds:group' },
                      { 'resource-id': 'urn:klf:ds:field:person.name' }
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Deny',
                    },
                    'system-a should not be able to read person fields from group datasource'
                );
            });

            test('system-a should be able to ask about read to person and group dataset in the same request if fields are not included', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                      { 'resource-id': 'urn:klf:ds:group' },
                      { 'resource-id': 'urn:klf:ds:person' }
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Permit',
                    },
                    'system-a should be able to ask about read to person and group dataset in the same request if fields are not included'
                );
            });

            test('system-a should not be able to ask about read to person and group dataset if fields are also included', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                      { 'resource-id': 'urn:klf:ds:group' },
                      { 'resource-id': 'urn:klf:ds:person' },
                      { 'resource-id': 'urn:klf:ds:field:person.name' }
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Deny',
                    },
                    'system-a should not be able to ask about read to person and group dataset if fields are also included'
                );
            });
        });

        describe('persondataset', () => {
            test('system-a should be able to read person datasource', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resource: { 'resource-id': 'urn:klf:ds:person' },
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Permit',
                    },
                    'system-a should be able to read person datasource'
                );
            });

            test('system-a should not be able to read group fields from person datasource', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                      { 'resource-id': 'urn:klf:ds:person' },
                      { 'resource-id': 'urn:klf:ds:field:group.name' }
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Deny',
                    },
                    'system-a should not be able to read group fields from person datasource'
                );
            });

            test('system-a should not be able to write person datasource', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resource: { 'resource-id': 'urn:klf:ds:person' },
                    action: { 'action-id': 'write' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Deny',
                    },
                    'system-a should not be able to write person datasource'
                );
            });

            test('system-a should be able to read person.name field', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                        { 'resource-id': 'urn:klf:ds:person' },
                        { 'resource-id': 'urn:klf:ds:field:person.name' },
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Permit',
                    },
                    'system-a should be able to read person.name field'
                );
            });

            test('system-a should be able to read person.dob field', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                        { 'resource-id': 'urn:klf:ds:person' },
                        { 'resource-id': 'urn:klf:ds:field:person.dob' },
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Permit',
                    },
                    'system-a should be able to read person.name field'
                );
            });

            test('system-a should be able to read person.dob and person.name field', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                        { 'resource-id': 'urn:klf:ds:person' },
                        { 'resource-id': 'urn:klf:ds:field:person.name' },
                        { 'resource-id': 'urn:klf:ds:field:person.dob' },
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Permit',
                    },
                    'system-a should be able to read person.name and person.dob field'
                );
            });

            test('system-a should not be able to read person.dob and person.name and person.ssn field', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                        { 'resource-id': 'urn:klf:ds:person' },
                        { 'resource-id': 'urn:klf:ds:field:person.name' },
                        { 'resource-id': 'urn:klf:ds:field:person.dob' },
                        { 'resource-id': 'urn:klf:ds:field:person.ssn' },
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Deny',
                    },
                    'system-a should not be able to read person.dob and person.name and person.ssn field'
                );
            });

            test('system-a should not be able to read person.ssn field', async () => {
                const request = XacmlTestUtils.createRequest({
                    subject: { 'subject-id': 'system-a', role: '' },
                    resources: [
                        { 'resource-id': 'urn:klf:ds:person' },
                        { 'resource-id': 'urn:klf:ds:field:person.ssn' },
                    ],
                    action: { 'action-id': 'read' },
                });

                const result = await client.evaluateRequest(domainId, request);

                XacmlTestUtils.assertDecision(
                    result,
                    {
                        decision: 'Deny',
                    },
                    'system-a should not be able to read person.ssn field'
                );
            });
        });
    });
});
