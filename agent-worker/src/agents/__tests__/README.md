# Agent Tests

This directory contains tests for the ReAct agentic loop implementation.

## Test Types

### Unit Tests
- `BaseAgent.test.ts` - Core ReAct loop logic with mocked AI/tools
- `parseAIResponse.test.ts` - AI response parsing
- `errorHandling.test.ts` - Error classification and tracking
- `promptBuilders.test.ts` - Prompt generation
- `extractToolCall.test.ts` - JSON tool extraction
- `errorMessages.test.ts` - Error message generation

### Integration Tests
- `TaskAgent.integration.test.ts` - End-to-end tests with real Convex and Claude API

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- BaseAgent.test.ts
```

### Run Integration Tests
Integration tests require environment variables and will skip if not configured:

```bash
# Required environment variables
export CLAUDE_API_KEY=sk-ant-api03-...
export TEST_CONVEX_URL=http://localhost:8000  # or your test deployment

# Optional
export TEST_AUTH_TOKEN=your-test-jwt

# Run integration tests
npm test -- TaskAgent.integration.test.ts
```

### Watch Mode
```bash
npm run test:watch
```

## Integration Test Scenarios

The integration tests verify the full ReAct loop with real API calls:

1. **Simple Task Creation Success** - Verifies agent creates task in one iteration
2. **Retry After Validation Error** - Verifies agent retries and fixes parameters
3. **Abort on Missing Event** - Verifies graceful failure handling
4. **Complex Nested Data** - Verifies JSON parser handles nested objects (estimatedCost)
5. **Metadata Tracking** - Verifies iteration history is tracked correctly
6. **Tool Usage Tracking** - Verifies tools used are tracked without duplicates

## Test Data Cleanup

Integration tests automatically clean up created tasks in the `afterAll` hook.

## CI/CD

Integration tests will skip in CI environments where API keys are not available. This allows the test suite to run without failures while still providing value in local development and staging environments where credentials are configured.
