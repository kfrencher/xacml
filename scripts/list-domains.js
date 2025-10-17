import AuthzForceClient from '../src/authzforce-client.js';
import xpath from 'xpath';
import { DOMParser } from 'xmldom';

/**
 * Get the external ID for a specific domain
 * @param {string} domainId - The domain ID
 * @param {AuthzForceClient} client - AuthzForce client instance
 * @returns {Promise<string|null>} External ID or null if not found
 */
async function getDomainExternalId(domainId, client) {
  try {
    const response = await client.axios.get(`/domains/${domainId}`);
    const xml = response.data;
    
    // Parse XML with DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Check for parsing errors
    const parseError = doc.getElementsByTagName('parsererror')[0];
    if (parseError) {
      throw new Error(`XML parsing error: ${parseError.textContent}`);
    }
    
    // Use XPath to find externalId attribute regardless of namespace prefix
    const externalIdAttribute = xpath.select1('//*[local-name()="properties"]/@externalId', doc);
    const externalId = (externalIdAttribute instanceof Node) ? externalIdAttribute?.nodeValue : null;
    
    return externalId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching domain ${domainId}:`, errorMessage);
    return null;
  }
}

/**
 * List all domains with their external IDs
 */
async function listDomains() {
  const client = new AuthzForceClient();
  try {
    console.log('Fetching list of domains...');
    const response = await client.axios.get('/domains');
    const xml = response.data;
    
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
    
    console.log(`Found ${linkElements.length} domains.`);
    
    if (linkElements.length === 0) {
      console.log('No domains found.');
      return;
    }
    
    console.log('\nDomains:');
    console.log('Domain ID\t\tExternal ID');
    console.log('----------------------------------------');
    
    for (const linkElement of linkElements) {
      if(!(linkElement instanceof Element)) {
        throw new Error('Link element is not an instance of Element.');
      }
      const href = linkElement.getAttribute('href');
      if (href) {
        const externalId = await getDomainExternalId(href, client);
        const displayExternalId = externalId || '(none)';
        console.log(`${href}\t\t${displayExternalId}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error listing domains:', errorMessage);
    process.exit(1);
  }
}

// Run the script
listDomains().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});