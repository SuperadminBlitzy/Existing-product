/**
 * Jest Setup Configuration
 * 
 * Global test configuration file for Jest that runs before each test suite.
 * Sets up test environment configuration including extended timeouts for async operations,
 * global test utilities, and consistent test behavior across all test files.
 * Ensures proper cleanup and isolation between tests.
 */

// Import Node.js built-in process module for handling process events and lifecycle
const process = require('process');

// Global test configuration
// Set extended timeout for integration tests requiring process spawning and async operations
jest.setTimeout(10000); // 10 seconds to accommodate integration tests

// Global variables to track server instances and event listeners for cleanup
let activeServerInstances = [];
let processEventListeners = [];

/**
 * Clean up server instances and related resources
 * Utility function to properly close server connections and prevent memory leaks
 * Called during test teardown to ensure proper cleanup between test runs
 */
function cleanupServerInstances() {
  // Close all active server instances
  activeServerInstances.forEach(server => {
    if (server && typeof server.close === 'function') {
      try {
        server.close();
      } catch (error) {
        // Silently handle server close errors to prevent test failures during cleanup
        console.warn('Warning: Error closing server instance:', error.message);
      }
    }
  });
  
  // Clear the instances array
  activeServerInstances = [];
  
  // Remove any remaining socket connections
  activeServerInstances.forEach(server => {
    if (server && server.listening) {
      try {
        // Force destroy connections if server is still listening
        server.destroy && server.destroy();
      } catch (error) {
        // Silently handle connection destroy errors
        console.warn('Warning: Error destroying server connections:', error.message);
      }
    }
  });
}

/**
 * Set up process event cleanup to prevent memory leaks
 * Configures process event listeners for proper cleanup during test execution
 * Handles uncaught exceptions and unhandled promise rejections consistently
 */
function setupProcessCleanup() {
  // Handle uncaught exceptions during tests
  const uncaughtExceptionHandler = (error) => {
    console.error('Uncaught Exception during tests:', error);
    // Clean up server instances before process termination
    cleanupServerInstances();
    // Remove all process event listeners to prevent memory leaks
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  };
  
  // Handle unhandled promise rejections during tests
  const unhandledRejectionHandler = (reason, promise) => {
    console.error('Unhandled Promise Rejection during tests:', reason);
    console.error('Promise:', promise);
    // Clean up server instances
    cleanupServerInstances();
  };
  
  // Handle process termination signals
  const terminationHandler = (signal) => {
    console.log(`Received ${signal} - cleaning up test resources`);
    cleanupServerInstances();
    // Remove event listeners
    processEventListeners.forEach(({ event, handler }) => {
      process.removeListener(event, handler);
    });
    processEventListeners = [];
    process.exit(0);
  };
  
  // Register process event listeners using process.on() method
  process.on('uncaughtException', uncaughtExceptionHandler);
  process.on('unhandledRejection', unhandledRejectionHandler);
  process.on('SIGTERM', terminationHandler);
  process.on('SIGINT', terminationHandler);
  
  // Track registered listeners for cleanup
  processEventListeners.push(
    { event: 'uncaughtException', handler: uncaughtExceptionHandler },
    { event: 'unhandledRejection', handler: unhandledRejectionHandler },
    { event: 'SIGTERM', handler: terminationHandler },
    { event: 'SIGINT', handler: terminationHandler }
  );
}

// Global setup: Configure process cleanup when Jest setup runs
setupProcessCleanup();

// Global beforeEach hook to ensure clean test environment
beforeEach(() => {
  // Clear any previous server instances
  cleanupServerInstances();
  
  // Reset active instances tracking
  activeServerInstances = [];
});

// Global afterEach hook for server instance cleanup
afterEach(async () => {
  // Clean up server instances after each test
  cleanupServerInstances();
  
  // Add small delay to ensure all async cleanup completes
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force garbage collection if available (for memory leak prevention)
  if (global.gc) {
    global.gc();
  }
});

// Global test teardown for final cleanup
afterAll(async () => {
  // Final cleanup of all resources
  cleanupServerInstances();
  
  // Remove all process event listeners using process.removeListener()
  processEventListeners.forEach(({ event, handler }) => {
    process.removeListener(event, handler);
  });
  processEventListeners = [];
  
  // Remove all remaining listeners using process.removeAllListeners()
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  
  // Final delay to ensure all cleanup completes
  await new Promise(resolve => setTimeout(resolve, 200));
});

// Helper function to register server instances for cleanup tracking
global.registerServerInstance = (server) => {
  if (server && !activeServerInstances.includes(server)) {
    activeServerInstances.push(server);
  }
};

// Export utility functions for external use
module.exports = {
  cleanupServerInstances,
  setupProcessCleanup
};