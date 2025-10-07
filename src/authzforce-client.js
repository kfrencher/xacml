import axios from 'axios';
import xml2js from 'xml2js';
import * as js2xmlparser from 'js2xmlparser';
import logger from './logger.js';
import { formatXml } from './xml-utils.js';

/**
 * @typedef {Object} XacmlSubject
 * @property {string} [id] - Subject identifier
 * @property {string} [role] - Subject role
 * @property {string} [department] - Subject department
 * @property {string} [clearance] - Subject security clearance
 */

/**
 * @typedef {Object} XacmlResource
 * @property {string} [id] - Resource identifier
 * @property {string} [type] - Resource type
 * @property {string} [owner] - Resource owner
 * @property {string} [classification] - Resource classification
 */

/**
 * @typedef {Object} XacmlAction
 * @property {string} [id] - Action identifier (read, write, delete, etc.)
 * @property {string} [method] - HTTP method
 */

/**
 * @typedef {Object} XacmlEnvironment
 * @property {string} [currentTime] - Current time in ISO format
 * @property {string} [location] - Access location
 * @property {string} [ipAddress] - Client IP address
 */

/**
 * @typedef {Object} XacmlRequest
 * @property {XacmlSubject} [subject] - Subject attributes
 * @property {XacmlResource} [resource] - Resource attributes
 * @property {XacmlResource[]} [resources] - Resource attributes
 * @property {XacmlAction} [action] - Action attributes
 * @property {XacmlEnvironment} [environment] - Environment attributes
 */

/**
 * @typedef {Object} XacmlDecisionResponse
 * @property {'Permit'|'Deny'|'Indeterminate'|'NotApplicable'} decision - The access decision
 * @property {string|null} status - Status code from the evaluation
 * @property {Array} [obligations] - Obligations to be fulfilled
 * @property {Array} [advice] - Advice from the policy
 */

/**
 * AuthzForce REST API Client
 * Provides methods to interact with AuthzForce server for XACML policy evaluation
 */
class AuthzForceClient {
  /**
   * Create a new AuthzForce client
   * @param {string} [baseUrl='http://localhost:8080/authzforce-ce'] - Base URL of AuthzForce server
   */
  constructor(baseUrl = 'http://localhost:8080/authzforce-ce') {
    /** @type {string} */
    this.baseUrl = baseUrl;
    /** @type {import('axios').AxiosInstance} */
    this.axios = /** @type {any} */ (axios).create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      }
    });
  }

  /**
   * Create a new policy domain
   * @param {string|null} [domainId=null] - Optional domain ID
   * @returns {Promise<string>} Created domain ID
   * @throws {Error} When domain creation fails
   */
  async createDomain(domainId = null) {
    const domainProperties = {
      '@': {
        'xmlns': 'http://authzforce.github.io/rest-api-model/xmlns/authz/5'
      },
      description: 'Test domain for XACML policy evaluation'
    };

    if (domainId) {
      domainProperties['@']['externalId'] = domainId;
    }

    const requestBody = js2xmlparser.parse('domainProperties', domainProperties);

    try {
      const response = await this.axios.post('/domains', requestBody);
      logger.debug(`Created domain with response: ${response.data}`);
      
      // Extract domain ID from response
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      logger.debug(`Created domain with processed response: ${JSON.stringify(result,null,4)}`);
      const createdDomainId = result['ns5:link']?.$.href?.split('/').pop();
      
      return createdDomainId;
    } catch (error) {
      throw new Error(`Failed to create domain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a policy domain
   * @param {string} domainId - Domain ID to delete
   * @returns {Promise<void>}
   * @throws {Error} When domain deletion fails
   */
  async deleteDomain(domainId) {
    try {
      await this.axios.delete(`/domains/${domainId}`);
    } catch (error) {
      throw new Error(`Failed to delete domain ${domainId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add a policy to a domain
   * @param {string} domainId - Domain ID
   * @param {string} policyXml - XACML policy XML string
   * @param {string} policyId - Policy ID (extracted from XML if not provided)
   * @returns {Promise<string>} Created policy version
   * @throws {Error} When policy addition fails
   */
  async addPolicy(domainId, policyXml, policyId) {

    try {
      const response = await this.axios.post(
        `/domains/${domainId}/pap/policies`,
        policyXml,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml'
          }
        }
      );

      // Extract policy version from response
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      // The href format is: "PolicySetId/Version", e.g., "MinimalTestPolicySet/1.0"
      const href = result?.['ns5:link']?.$?.href;
      const version = href ? href.split('/').pop() : null;
      
      return version;
    } catch (error) {
      console.error('Error adding policy:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = /** @type {any} */ (error);
        console.error('Response status:', axiosError.response?.status);
        console.error('Response headers:', axiosError.response?.headers);
        console.error('Response data:', axiosError.response?.data);
        console.error('Request URL:', axiosError.config?.url);
        console.error('Request method:', axiosError.config?.method);
        console.error('Request headers:', axiosError.config?.headers);
      }
      throw new Error(`Failed to add policy ${policyId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set the active policy version for a domain
   * @param {string} domainId - Domain ID
   * @param {string} policyId - Policy ID
   * @returns {Promise<void>}
   * @throws {Error} When setting active policy fails
   */
  async setActivePolicy(domainId, policyId) {
    // Try the basic format without the wrapper element
    const requestBody = 
    `<?xml version="1.0" encoding="UTF-8"?>
      <pdpPropertiesUpdate xmlns="http://authzforce.github.io/rest-api-model/xmlns/authz/5">
        <rootPolicyRefExpression>${policyId}</rootPolicyRefExpression>
      </pdpPropertiesUpdate>`;

    try {
      logger.debug(`Setting root policy for domain ${domainId} with policyId ${policyId}`);
      logger.debug(`Request body: ${requestBody}`);
      
      await this.axios.put(
        `/domains/${domainId}/pap/pdp.properties`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml'
          }
        }
      );
    } catch (error) {
      logger.error('Error setting active policy:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = /** @type {any} */ (error);
        logger.error('Response status:', axiosError.response?.status);
        logger.error('Response headers:', axiosError.response?.headers);
        logger.error('Response data:', axiosError.response?.data);
        logger.error('Request URL:', axiosError.config?.url);
        logger.error('Request method:', axiosError.config?.method);
        console.error('Request headers:', axiosError.config?.headers);
      }
      throw new Error(`Failed to set active policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Evaluate an XACML request against the active policy
   * @param {string} domainId - Domain ID
   * @param {XacmlRequest} request - XACML request object
   * @returns {Promise<XacmlDecisionResponse>} Decision response
   * @throws {Error} When request evaluation fails
   */
  async evaluateRequest(domainId, request) {
    const requestXml = this.buildRequestXml(request);
    logger.debug(`Evaluating request XML:\n${formatXml(requestXml)}`);
    
    try {
      const response = await this.axios.post(
        `/domains/${domainId}/pdp`,
        requestXml,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml'
          }
        }
      );
      
      logger.debug(`Evaluation response: ${formatXml(response.data)}`);

      return await this.parseDecisionResponse(response.data);
    } catch (error) {
      console.error('Error evaluating request:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = /** @type {any} */ (error);
        console.error('Response status:', axiosError.response?.status);
        console.error('Response headers:', axiosError.response?.headers);
        console.error('Response data:', axiosError.response?.data);
        console.error('Request URL:', axiosError.config?.url);
        console.error('Request method:', axiosError.config?.method);
        console.error('Request headers:', axiosError.config?.headers);
      }
      throw new Error(`Failed to evaluate request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build XACML request XML from request object
   * @param {XacmlRequest} request - Request object with subject, resource, action, environment
   * @returns {string} XACML request XML
   * @private
   */
  buildRequestXml(request) {
    const attributes = [];

    // Add subject attributes
    if (request.subject) {
      Object.entries(request.subject).forEach(([key, value]) => {
        attributes.push({
          '@': {
            'AttributeId': `urn:oasis:names:tc:xacml:1.0:subject:${key}`,
            'IncludeInResult': 'false'
          },
          'AttributeValue': {
            '@': {
              'DataType': 'http://www.w3.org/2001/XMLSchema#string'
            },
            '#': value
          }
        });
      });
    }

    // Add resource attributes
    if (request.resource) {
      Object.entries(request.resource).forEach(([key, value]) => {
        attributes.push({
          '@': {
            'AttributeId': `urn:oasis:names:tc:xacml:1.0:resource:${key}`,
            'IncludeInResult': 'false'
          },
          'AttributeValue': {
            '@': {
              'DataType': 'http://www.w3.org/2001/XMLSchema#string'
            },
            '#': value
          }
        });
      });
    }
    if (request.resources) {
      request.resources.forEach((res) => {
        Object.entries(res).forEach(([key, value]) => {
          attributes.push({
            '@': {
              'AttributeId': `urn:oasis:names:tc:xacml:1.0:resource:${key}`,
              'IncludeInResult': 'false'
            },
            'AttributeValue': {
              '@': {
                'DataType': 'http://www.w3.org/2001/XMLSchema#string'
              },
              '#': value
            }
          });
        });
      });
    }

    // Add action attributes
    if (request.action) {
      Object.entries(request.action).forEach(([key, value]) => {
        attributes.push({
          '@': {
            'AttributeId': `urn:oasis:names:tc:xacml:1.0:action:${key}`,
            'IncludeInResult': 'false'
          },
          'AttributeValue': {
            '@': {
              'DataType': 'http://www.w3.org/2001/XMLSchema#string'
            },
            '#': value
          }
        });
      });
    }

    const requestObj = {
      '@': {
        'xmlns': 'urn:oasis:names:tc:xacml:3.0:core:schema:wd-17',
        'ReturnPolicyIdList': 'false',
        'CombinedDecision': 'false'
      },
      'Attributes': [
        {
          '@': {
            'Category': 'urn:oasis:names:tc:xacml:1.0:subject-category:access-subject'
          },
          'Attribute': attributes.filter(attr => attr['@'].AttributeId.includes('subject'))
        },
        {
          '@': {
            'Category': 'urn:oasis:names:tc:xacml:3.0:attribute-category:resource'
          },
          'Attribute': attributes.filter(attr => attr['@'].AttributeId.includes('resource'))
        },
        {
          '@': {
            'Category': 'urn:oasis:names:tc:xacml:3.0:attribute-category:action'
          },
          'Attribute': attributes.filter(attr => attr['@'].AttributeId.includes('action'))
        }
      ].filter(category => category.Attribute.length > 0)
    };

    return js2xmlparser.parse('Request', requestObj);
  }

  /**
   * Parse XACML decision response
   * @param {string} responseXml - XACML response XML
   * @returns {Promise<XacmlDecisionResponse>} Parsed decision object
   * @private
   */
  async parseDecisionResponse(responseXml) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(responseXml);
    
    // Handle namespaced response
    const response = result['ns3:Response'] || result.Response;
    if (!response) {
      throw new Error('No Response element found in parsed result');
    }
    
    const resultElement = response['ns3:Result'] || response.Result;
    if (!resultElement || !resultElement[0]) {
      throw new Error('No Result element found in response');
    }
    
    const decision = (resultElement[0]['ns3:Decision'] || resultElement[0].Decision)[0];
    const status = resultElement[0]['ns3:Status'] || resultElement[0].Status;
    
    return {
      decision,
      status: status ? status[0].StatusCode[0].$.Value : null,
      obligations: resultElement[0].Obligations || [],
      advice: resultElement[0].AssociatedAdvice || []
    };
  }

  /**
   * Health check for AuthzForce server
   * @returns {Promise<boolean>} Server health status
   */
  async healthCheck() {
    try {
      const response = await this.axios.get('/domains');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export default AuthzForceClient;