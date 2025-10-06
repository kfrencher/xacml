const AuthzForceClient = require('../src/authzforce-client');
const logger = require('../src/logger');

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