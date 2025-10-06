import AuthzForceClient from '../src/authzforce-client.js';
import logger from '../src/logger.js';
import xml2js from 'xml2js';

/**
 * @param {string} domainId 
 * @returns {Promise<void>}
 */
async function listPolicies(domainId) {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get(`/domains/${domainId}/pap/policies`);
    const xml = response.data;
    logger.debug('Policies XML:', xml);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    const links = result['ns2:resources']['ns5:link'] || [];
    logger.info(`Found ${links.length} policy.`);
    for (const link of links) {
      const policyId = link['$']['href'];
      logger.info(policyId);
    }
  } catch (error) {
    logger.error(`Error listing policies for domain ${domainId}:`, error);
  }
}

const domainId = process.argv[2];
listPolicies(domainId);