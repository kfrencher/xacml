const AuthzForceClient = require('../src/authzforce-client');

/**
 * @param {string} domainId 
 * @returns {Promise<void>}
 */
async function listPolicies(domainId) {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get(`/domains/${domainId}/pap/policies`);
    const xml = response.data;
    console.log('Policies XML:', xml);
    const parser = new (require('xml2js').Parser)();
    const result = await parser.parseStringPromise(xml);
    const links = result['ns2:resources']['ns5:link'] || [];
    console.log(`Found ${links.length} policy.`);
    for (const link of links) {
      const policyId = link['$']['href'];
      console.log(policyId);
    }
  } catch (error) {
    console.error(`Error listing policies for domain ${domainId}:`, error);
  }
}

const domainId = process.argv[2];
listPolicies(domainId);