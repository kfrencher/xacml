import AuthzForceClient from '../src/authzforce-client.js';
import logger from '../src/logger.js';

/**
 * @param {string} domainId 
 */
async function createDomain(domainId) {
  const client = new AuthzForceClient();
  try {
    client.createDomain(domainId);
    logger.info(`Domain ${domainId} created successfully.`);
  } catch (error) {
    logger.error('Error creating domain:', error);
  }
}

const domainId = process.argv[2];
createDomain(domainId);