const AuthzForceClient = require('./authzforce-client');

async function deleteAllDomains() {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get('/domains');
    const xml = response.data;
    const parser = new (require('xml2js').Parser)();
    const result = await parser.parseStringPromise(xml);
    const links = result['ns2:resources']['ns5:link'] || [];
    console.log(`Found ${links.length} domains to delete.`);
    for (const link of links) {
      const domainId = link['$']['href'];
      console.log(`Deleting domain: ${domainId}`);
      await client.axios.delete(`/domains/${domainId}`);
    }
    console.log('All domains deleted.');
  } catch (error) {
    console.error('Error deleting domains:', error);
  }
}

deleteAllDomains();