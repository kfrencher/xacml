# XACML Policy Testing Framework

A comprehensive Node.js testing framework for XACML policies using AuthzForce REST API. This framework provides enterprise-grade XACML policy evaluation with the flexibility and convenience of Node.js testing tools.

## 🚀 Features

- **AuthzForce Integration**: Full integration with AuthzForce REST API for XACML 3.0 compliance
- **Test Framework**: Built on Jest with custom utilities for XACML testing
- **Data-Driven Testing**: Support for JSON-based test case definitions
- **Docker Support**: Easy AuthzForce server setup with Docker Compose
- **Policy Management**: Utilities for loading, validating, and managing XACML policies
- **Comprehensive Examples**: Sample policies and test cases included

## 📋 Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose (for local AuthzForce server)
- Basic understanding of XACML concepts

## 🛠️ Installation

1. **Clone and Setup Project**:
   ```bash
   cd xacml-tests
   npm install
   ```

2. **Start AuthzForce Server**:
   ```bash
   # Using npm scripts
   npm run docker:up
   
   # Or using the management script directly
   chmod +x docker/manage-authzforce.sh
   ./docker/manage-authzforce.sh start
   ```

3. **Verify Setup**:
   ```bash
   # Test AuthzForce connection
   ./docker/manage-authzforce.sh test
   
   # Run sample tests
   npm test
   ```

## 📁 Project Structure

```
xacml-tests/
├── src/
│   ├── authzforce-client.js    # AuthzForce REST API client
│   └── test-utils.js           # Testing utilities and helpers
├── test/
│   ├── setup.js                # Jest test configuration
│   ├── role-based-policy.test.js    # Example structured tests
│   └── data-driven.test.js     # Data-driven test examples
├── policies/
│   ├── role-based-policy.xml   # Sample RBAC policy
│   └── time-based-policy.xml   # Sample time-based policy
├── test-data/
│   └── role-based-tests.json   # Test case definitions
├── docker/
│   ├── docker-compose.yml      # AuthzForce server setup
│   └── manage-authzforce.sh    # Server management script
└── package.json
```

## 🧪 Writing Tests

### Basic Test Structure

```javascript
const AuthzForceClient = require('../src/authzforce-client');
const XacmlTestUtils = require('../src/test-utils');

describe('My XACML Policy Tests', () => {
  let client;
  let domainId;
  const createdDomains = [];

  beforeAll(async () => {
    client = new AuthzForceClient();
    
    // Wait for AuthzForce to be ready
    const isHealthy = await XacmlTestUtils.waitForCondition(
      () => client.healthCheck(),
      60000
    );
    
    if (!isHealthy) {
      throw new Error('AuthzForce server not available');
    }
  });

  beforeEach(async () => {
    // Create domain and deploy policy for each test
    domainId = XacmlTestUtils.generateDomainId('my-test');
    domainId = await client.createDomain(domainId);
    createdDomains.push(domainId);
    
    const policyXml = await XacmlTestUtils.loadPolicy('./policies/my-policy.xml');
    const policyId = XacmlTestUtils.extractPolicyId(policyXml);
    const version = await client.addPolicy(domainId, policyXml, policyId);
    await client.setActivePolicy(domainId, policyId, version);
  });

  afterAll(async () => {
    await XacmlTestUtils.cleanupDomains(client, createdDomains);
  });

  test('User with admin role can access resource', async () => {
    const request = XacmlTestUtils.createRequest({
      subject: { id: 'admin1', role: 'admin' },
      resource: { id: 'doc123', type: 'document' },
      action: { id: 'read' }
    });

    const result = await client.evaluateRequest(domainId, request);
    
    XacmlTestUtils.assertDecision(result, {
      decision: 'Permit'
    });
  });
});
```

### Data-Driven Testing

Create test case definitions in JSON:

```json
{
  "testSuite": "My Policy Tests",
  "policy": "my-policy.xml",
  "testCases": [
    {
      "name": "Admin can read",
      "description": "Administrator should have read access",
      "request": {
        "subject": { "id": "admin1", "role": "admin" },
        "resource": { "id": "doc123", "type": "document" },
        "action": { "id": "read" }
      },
      "expected": {
        "decision": "Permit"
      }
    }
  ]
}
```

Then run data-driven tests:

```javascript
test('Execute all test cases from JSON', async () => {
  const testCases = await XacmlTestUtils.generateTestCases('./test-data/my-tests.json');
  
  for (const testCase of testCases) {
    const result = await client.evaluateRequest(domainId, testCase.request);
    XacmlTestUtils.assertDecision(result, testCase.expected, testCase.name);
  }
});
```

## 🔧 API Reference

### AuthzForceClient

```javascript
const client = new AuthzForceClient('http://localhost:8080/authzforce-ce');

// Domain management
const domainId = await client.createDomain('my-domain');
await client.deleteDomain(domainId);

// Policy management
const version = await client.addPolicy(domainId, policyXml, policyId);
await client.setActivePolicy(domainId, policyId, version);

// Request evaluation
const result = await client.evaluateRequest(domainId, request);

// Health check
const isHealthy = await client.healthCheck();
```

### XacmlTestUtils

```javascript
// Load policy from file
const policyXml = await XacmlTestUtils.loadPolicy('./policies/my-policy.xml');

// Create standardized request
const request = XacmlTestUtils.createRequest({
  subject: { id: 'user1', role: 'admin' },
  resource: { id: 'resource1', type: 'document' },
  action: { id: 'read' }
});

// Assert decision
XacmlTestUtils.assertDecision(actual, expected, 'Test description');

// Generate test cases from JSON
const testCases = await XacmlTestUtils.generateTestCases('./test-data/tests.json');

// Cleanup utilities
await XacmlTestUtils.cleanupDomains(client, domainIds);
```

## 🐳 Docker Management

The project includes a management script for easy AuthzForce server operations:

```bash
# Start server
./docker/manage-authzforce.sh start

# Check status
./docker/manage-authzforce.sh status

# View logs
./docker/manage-authzforce.sh logs

# Test connection
./docker/manage-authzforce.sh test

# Stop server
./docker/manage-authzforce.sh stop

# Full cleanup
./docker/manage-authzforce.sh cleanup
```

Or use npm scripts:

```bash
npm run docker:up      # Start AuthzForce
npm run docker:down    # Stop AuthzForce
npm run docker:logs    # View logs
```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test role-based-policy.test.js

# Run tests with custom AuthzForce URL
AUTHZFORCE_URL=http://custom-server:8080/authzforce-ce npm test
```

## 📝 Sample Policies

The project includes sample XACML policies:

### Role-Based Access Control (`role-based-policy.xml`)
- **Admin**: Full access (read, update, delete)
- **Manager**: Read and update access
- **User**: Read-only access

### Time-Based Access Control (`time-based-policy.xml`)
- Allows access only during business hours (9 AM - 5 PM)
- Applied to sensitive documents

## 🔍 Test Examples

### Structured Testing
See `test/role-based-policy.test.js` for examples of:
- Organized test suites by role
- Comprehensive permission testing
- Edge case handling

### Data-Driven Testing
See `test/data-driven.test.js` for examples of:
- JSON-based test definitions
- Bulk test execution
- Dynamic test generation

## 🛡️ Best Practices

1. **Domain Isolation**: Create a new domain for each test to ensure isolation
2. **Cleanup**: Always clean up created domains in test teardown
3. **Health Checks**: Verify AuthzForce availability before running tests
4. **Error Handling**: Include meaningful error messages in assertions
5. **Test Organization**: Group related tests logically
6. **Data Separation**: Keep test data in separate JSON files for maintainability

## 🚨 Troubleshooting

### AuthzForce Not Starting
```bash
# Check Docker status
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs authzforce

# Restart services
./docker/manage-authzforce.sh restart
```

### Test Failures
```bash
# Run with verbose output
VERBOSE_TESTS=true npm test

# Check AuthzForce connection
./docker/manage-authzforce.sh test

# Verify policy syntax
npm test -- --verbose
```

### Port Conflicts
If port 8080 is already in use, modify `docker/docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Use port 8081 instead
```

Then update the AuthzForce URL in tests:
```bash
AUTHZFORCE_URL=http://localhost:8081/authzforce-ce npm test
```

## 📚 Additional Resources

- [XACML 3.0 Specification](http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html)
- [AuthzForce Documentation](https://authzforce.ow2.org/)
- [Jest Testing Framework](https://jestjs.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details