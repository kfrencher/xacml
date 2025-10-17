import AuthzForceClient from '../src/authzforce-client.js';
import xpath from 'xpath';
import { DOMParser } from 'xmldom';

async function deleteAllDomains() {
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
    
    console.log(`Found ${linkElements.length} domains to delete.`);
    
    if (linkElements.length === 0) {
      console.log('No domains found to delete.');
      return;
    }
    
    for (const linkElement of linkElements) {
      if(!(linkElement instanceof Element)) {
        throw new Error('Link element is not an instance of Element.');
      }
      const href = linkElement.getAttribute('href');
      if (href) {
        console.log(`Deleting domain: ${href}`);
        try {
          await client.deleteDomain(href);
          console.log(`Successfully deleted domain: ${href}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Failed to delete domain ${href}:`, errorMessage);
        }
      }
    }
    
    console.log('Domain cleanup completed.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error deleting domains:', errorMessage);
    process.exit(1);
  }
}

// Run the cleanup
deleteAllDomains().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});