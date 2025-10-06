const logger = require('../src/logger');

// Test different log levels
console.log('Testing logging system...\n');

logger.error('This is an ERROR message - always shown');
logger.warn('This is a WARN message - shown at WARN and above');
logger.info('This is an INFO message - shown at INFO and above'); 
logger.debug('This is a DEBUG message - only shown at DEBUG level');

console.log('\nCurrent log level:', process.env.LOG_LEVEL || 'INFO');
console.log('Try running with different levels:');
console.log('  LOG_LEVEL=ERROR node scripts/test-logging.js');
console.log('  LOG_LEVEL=WARN node scripts/test-logging.js');
console.log('  LOG_LEVEL=INFO node scripts/test-logging.js');
console.log('  LOG_LEVEL=DEBUG node scripts/test-logging.js');