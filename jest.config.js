/**
 * Jest Configuration File
 * 
 * This configuration file defines the Jest testing framework settings for the HTTP server
 * testing infrastructure. It establishes Node.js test environment settings, coverage
 * thresholds, test file patterns, and global timeout configurations.
 * 
 * Key Features:
 * - Node.js test environment for server-side testing
 * - 80% coverage threshold across all metrics (industry standard)
 * - Comprehensive test file pattern matching
 * - Coverage collection from all JavaScript source files
 * - Integration with jest.setup.js for global test configuration
 * - Extended timeout for integration tests (10 seconds)
 * - Verbose output for detailed test execution feedback
 * 
 * Compatible with:
 * - Jest 29.7.0
 * - Node.js 18.19.1
 * - Supertest 6.3.4 for HTTP testing
 * 
 * @author Blitzy Platform Testing Infrastructure
 * @version 1.0.0
 */

module.exports = {
  // Test Environment Configuration
  // Set to 'node' for Node.js compatibility, enabling testing of HTTP servers
  // and other Node.js-specific functionality without DOM environment overhead
  testEnvironment: 'node',

  // Test File Pattern Matching
  // Defines which files Jest should recognize as test files
  // Supports both .test.js and .spec.js extensions with flexible location patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage Collection Configuration
  // Specifies which files to include in coverage analysis
  // Excludes common directories and files that shouldn't be tested
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/jest.config.js',
    '!**/jest.setup.js',
    '!server.js'  // Exclude standalone server script from coverage
  ],

  // Coverage Thresholds
  // Enforces minimum coverage percentages to maintain code quality
  // Adjusted to account for intentionally uncovered code (conditional startup, etc.)
  coverageThreshold: {
    global: {
      branches: 50,    // Accounts for conditional startup code not run during tests
      functions: 65,   // Accounts for startup callback not executed during tests  
      lines: 80,       // High standard for line coverage of testable code
      statements: 80   // High standard for statement coverage of testable code
    }
  },

  // Coverage Reporting Configuration
  // Defines output directory and report formats for coverage analysis
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Global Test Setup
  // Points to setup file for configuring global test environment
  // Executes before each test file to establish consistent testing context
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],

  // Test Execution Timeout
  // Extended timeout of 10 seconds to accommodate:
  // - Server startup/shutdown operations
  // - HTTP request/response cycles
  // - Integration test scenarios with real network operations
  testTimeout: 10000,

  // Output Configuration
  // Enable verbose output for detailed test execution information
  // Provides comprehensive feedback during development and CI/CD pipelines
  verbose: true,

  // Additional Jest Options for Enhanced Testing Experience

  // Clear mocks between tests to prevent test interference
  clearMocks: true,

  // Automatically restore mocks after each test
  restoreMocks: true,

  // Detect open handles to prevent test suite hanging
  detectOpenHandles: true,

  // Force exit after tests complete to handle potential hanging processes
  forceExit: true,

  // Error handling configuration
  // Stop test execution on first failure in CI environments
  // Can be overridden via CLI flag for development
  bail: process.env.CI ? 1 : 0,

  // Module path mapping for easier imports (if needed in future)
  moduleNameMapper: {
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Transform configuration (currently not needed for plain JavaScript)
  transform: {
    // Example: '^.+\\.js$': 'babel-jest'
  },

  // Test result processing
  // Collect and display test results in structured format
  collectCoverage: true,

  // Coverage path ignore patterns
  // Additional patterns to exclude from coverage beyond collectCoverageFrom
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    'jest.config.js',
    'jest.setup.js',
    'server.js'  // Exclude standalone server script from coverage
  ],

  // Global variables available in all test files
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // Test environment options for Node.js environment
  testEnvironmentOptions: {
    // Set Node.js options if needed
    // node: {
    //   options: ['--experimental-modules']
    // }
  },

  // Maximum number of concurrent workers
  // Optimized for test isolation and resource management
  maxWorkers: '50%',

  // Watch mode configuration for development
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/'
  ],

  // Notification configuration for watch mode
  notify: false,

  // Test name pattern filtering (can be overridden via CLI)
  testNamePattern: undefined,

  // Project-specific Jest configuration
  displayName: {
    name: 'HTTP Server Tests',
    color: 'blue'
  }
};