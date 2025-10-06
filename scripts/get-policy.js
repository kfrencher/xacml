const AuthzForceClient = require('../src/authzforce-client');
const { formatXml } = require('../src/xml-utils');

/**
 * @param {string} domainId 
 * @param {string} policyId
 * @returns {Promise<void>}
 */
async function getPolicy(domainId, policyId) {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get(`/domains/${domainId}/pap/policies/${policyId}/latest`);
    const xml = response.data;
    const formattedXml = formatXml(xml);
    console.log('Policy XML:\n' + formattedXml);
  } catch (error) {
    console.error(`Error listing policy ${policyId} for domain ${domainId}:`, error);
  }
}

const domainId = process.argv[2];
const policyId = process.argv[3];
getPolicy(domainId, policyId);