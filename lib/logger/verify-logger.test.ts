/**
 * Standalone logger verification test
 *
 * This script directly tests the structured logger functionality
 * without requiring a running Next.js server.
 */

import { createLogger, generateCorrelationId } from './index.js';

console.log('=== Structured Logging Verification Test ===\n');

// Test 1: Basic logger creation
console.log('Test 1: Create basic logger');
const logger = createLogger({ context: 'TestContext' });
console.log('✓ Logger created successfully\n');

// Test 2: Correlation ID generation
console.log('Test 2: Generate correlation ID');
const correlationId = generateCorrelationId();
console.log(`Generated correlation ID: ${correlationId}`);
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(correlationId)) {
  throw new Error('Correlation ID should be a valid UUID v4');
}
console.log('✓ Correlation ID is valid UUID v4 format\n');

// Test 3: Test different log levels
console.log('Test 3: Test log levels');
logger.debug('This is a debug message', { test: 'data' });
logger.info('This is an info message', { test: 'data' });
logger.warn('This is a warning message', { test: 'data' });
logger.error('This is an error message', new Error('Test error'), {
  test: 'data',
});
logger.critical('This is a critical message', new Error('Critical error'), {
  test: 'data',
});
console.log('✓ All log levels executed\n');

// Test 4: Logger with correlation ID
console.log('Test 4: Logger with correlation ID');
const loggerWithCorrelation = logger.withCorrelationId(correlationId);
loggerWithCorrelation.info('Message with correlation ID');
console.log('✓ Logger with correlation ID works\n');

// Test 5: Logger with user context
console.log('Test 5: Logger with user context');
const loggerWithUser = logger.withUser('user-123', 'org-456');
loggerWithUser.info('Message with user context');
console.log('✓ Logger with user context works\n');

// Test 6: Logger with additional data
console.log('Test 6: Logger with additional data');
const loggerWithData = logger.withData({ customField: 'customValue' });
loggerWithData.info('Message with custom data');
console.log('✓ Logger with custom data works\n');

// Test 7: Chained logger methods
console.log('Test 7: Chained logger methods');
const chainedLogger = logger
  .withCorrelationId(generateCorrelationId())
  .withUser('user-789')
  .withData({ operation: 'test', requestId: '12345' });
chainedLogger.info('Chained logger message');
console.log('✓ Chained logger methods work\n');

// Test 8: Multiple correlation IDs are unique
console.log('Test 8: Verify correlation ID uniqueness');
const id1 = generateCorrelationId();
const id2 = generateCorrelationId();
const id3 = generateCorrelationId();
if (id1 === id2 || id2 === id3 || id1 === id3) {
  throw new Error('Correlation IDs should be unique');
}
console.log('ID 1:', id1);
console.log('ID 2:', id2);
console.log('ID 3:', id3);
console.log('✓ All correlation IDs are unique\n');

console.log('=== All Tests Passed ✓ ===');
