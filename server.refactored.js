const http = require('http');

/**
 * Testable HTTP server implementation that maintains the same functionality
 * as the original server.js but with modular structure for better testability.
 * 
 * This refactored version:
 * - Exports the server instance for unit testing
 * - Provides conditional startup (only when run directly)
 * - Maintains identical request/response behavior
 * - Enables proper test isolation and coverage reporting
 */

// Server configuration - matches original server.js
const hostname = '127.0.0.1';
const port = 3000;

/**
 * Creates and configures the HTTP server with the same request handler
 * as the original server.js implementation.
 * 
 * Request Handler Behavior:
 * - Returns HTTP 200 status code
 * - Sets Content-Type header to 'text/plain'
 * - Responds with 'Hello, World!\n' message
 * 
 * @returns {http.Server} Configured HTTP server instance
 */
function createServer() {
  return http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello, World!\n');
  });
}

// Create the server instance
const server = createServer();

/**
 * Start the server only when this file is run directly.
 * This prevents automatic server startup during testing,
 * enabling proper test isolation.
 */
if (require.main === module) {
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}

/**
 * Export the server instance for testing and external use.
 * The exported server provides all standard http.Server methods:
 * - listen(): Start the server on specified port/hostname
 * - close(): Stop the server and close all connections
 * - address(): Get server address information
 * - on(): Add event listeners for server events
 * - removeListener(): Remove event listeners
 */
module.exports = server;