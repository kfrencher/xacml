const AuthzForceClient = require('../src/authzforce-client');

/**
 * @param {string} domainId 
 */
async function createDomain(domainId) {
  const client = new AuthzForceClient();
  try {
    client.createDomain(domainId);
    console.log(`Domain ${domainId} created successfully.`);
  } catch (error) {
    console.error('Error creating domain:', error);
  }
}

const domainId = process.argv[2];
createDomain(domainId);