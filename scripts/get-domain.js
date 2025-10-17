import AuthzForceClient from '../src/authzforce-client.js';
import { formatXml } from '../src/xml-utils.js';

/**
 * @param {string} domainId 
 */
async function getDomain(domainId) {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get(`/domains/${domainId}/pap/pdp.properties`);
    const xml = response.data;
    console.log('Domain PDP Properties XML:\n' + formatXml(xml));
  } catch (error) {
    console.error('Error listing domains:', error);
  }
}

const domainId = process.argv[2];
getDomain(domainId);