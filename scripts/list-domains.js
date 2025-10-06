const AuthzForceClient = require('../src/authzforce-client');

async function getDomainExternalId(domainId) {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get(`/domains/${domainId}`);
    const xml = response.data;
    const parser = new (require('xml2js').Parser)();
    const result = await parser.parseStringPromise(xml);
    const externalId = result['ns2:domain']['ns2:properties']?.[0].$.externalId || null;
    return externalId;
  } catch (error) {
    console.error(`Error fetching domain ${domainId}:`, error);
    return null;
  }
}

async function listDomains() {
  const client = new AuthzForceClient();
  try {
    const response = await client.axios.get('/domains');
    const xml = response.data;
    const parser = new (require('xml2js').Parser)();
    const result = await parser.parseStringPromise(xml);
    const links = result['ns2:resources']['ns5:link'] || [];
    console.log(`Found ${links.length} domains.`);
    for (const link of links) {
      const domainId = link['$']['href'];
      const externalId = await getDomainExternalId(domainId);
      console.log(`${domainId}:${externalId}`);
    }
  } catch (error) {
    console.error('Error listing domains:', error);
  }
}

listDomains();