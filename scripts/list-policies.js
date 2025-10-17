import AuthzForceClient from '../src/authzforce-client.js';
import logger from '../src/logger.js';
import xpath from 'xpath';
import { DOMParser } from 'xmldom';

/**
 * List all policies for a specific domain
 * @param {string} domainId - The domain ID to list policies for
 * @returns {Promise<void>}
 */
async function listPolicies(domainId) {
  const client = new AuthzForceClient();
  try {
    console.log(`Fetching policies for domain: ${domainId}`);
    const response = await client.axios.get(`/domains/${domainId}/pap/policies`);
    const xml = response.data;
    
    logger.debug('Policies XML:', xml);
    
    // Parse XML with DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Check for parsing errors
    const parseError = doc.getElementsByTagName('parsererror')[0];
    if (parseError) {
      throw new Error(`XML parsing error: ${parseError.textContent}`);
    }
    
    // Use XPath to find all link elements regardless of namespace prefix
    const linkElements = xpath.select('//*[local-name()="link"]', doc);
    if(!Array.isArray(linkElements)) {
      throw new Error('Failed to select link elements from XML.');
    }
    
    console.log(`Found ${linkElements.length} policies.`);
    
    if (linkElements.length === 0) {
      console.log('No policies found.');
      return;
    }
    
    console.log('\nPolicies:');
    console.log('----------------------------------------');
    
    for (const linkElement of linkElements) {
      if(!(linkElement instanceof Element)) {
        throw new Error('Link element is not an instance of Element.');
      }
      const href = linkElement.getAttribute('href');
      if (href) {
        console.log(href);
        logger.info(`Policy: ${href}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error listing policies for domain ${domainId}:`, errorMessage);
    process.exit(1);
  }
}

// Get domain ID from command line arguments
const domainId = process.argv[2];

if (!domainId) {
  console.error('Usage: node scripts/list-policies.js <domain-id>');
  console.error('Example: node scripts/list-policies.js domain-123');
  process.exit(1);
}

// Run the script
listPolicies(domainId).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});