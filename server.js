const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Configuration constants
const hostname = '127.0.0.1';
const port = 3000;

// Security and performance limits
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const MAX_HEADER_SIZE = 8192; // 8KB
const MAX_URL_LENGTH = 2048; // 2KB
const REQUEST_TIMEOUT = 30000; // 30 seconds
const SOCKET_TIMEOUT = 60000; // 60 seconds
const KEEP_ALIVE_TIMEOUT = 5000; // 5 seconds
const HEADERS_TIMEOUT = 60000; // 60 seconds
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10 seconds

// Connection tracking for graceful shutdown
const activeConnections = new Set();
let isShuttingDown = false;

// Input validation functions
function isValidHttpMethod(method) {
  const allowedMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];
  return allowedMethods.includes(method.toUpperCase());
}

function validateHeaders(headers) {
  const headerString = JSON.stringify(headers);
  if (headerString.length > MAX_HEADER_SIZE) {
    return false;
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
  for (const header of suspiciousHeaders) {
    if (headers[header] && headers[header].length > 255) {
      return false;
    }
  }
  
  return true;
}

function validateUrl(urlString) {
  if (urlString.length > MAX_URL_LENGTH) {
    return false;
  }
  
  try {
    const parsed = url.parse(urlString);
    // Prevent path traversal attempts
    if (parsed.pathname && parsed.pathname.includes('..')) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Enhanced request handler with comprehensive validation and error handling
function handleRequest(req, res) {
  const startTime = Date.now();
  
  try {
    // Set request timeout
    req.setTimeout(REQUEST_TIMEOUT, () => {
      if (!res.headersSent) {
        res.statusCode = 408;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Request Timeout');
      }
      req.destroy();
    });

    // Validate HTTP method
    if (!isValidHttpMethod(req.method)) {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Allow', 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH');
      res.end('Method Not Allowed');
      return;
    }

    // Validate headers
    if (!validateHeaders(req.headers)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Bad Request: Invalid headers');
      return;
    }

    // Validate URL
    if (!validateUrl(req.url)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Bad Request: Invalid URL');
      return;
    }

    // Handle different HTTP methods
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.setHeader('Allow', 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Content-Type', 'text/plain');
      res.end('OK');
      return;
    }

    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', 'Hello, World!\n'.length);
      res.end();
      return;
    }

    // Handle POST/PUT requests with body size validation
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      let body = '';
      let bodySize = 0;

      req.on('data', chunk => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          res.statusCode = 413;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Payload Too Large');
          req.destroy();
          return;
        }
        body += chunk.toString();
      });

      req.on('end', () => {
        // Process the request body here if needed
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello, World!\n');
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        if (!res.headersSent) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Bad Request');
        }
      });

      return;
    }

    // Default response for GET and other methods
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello, World!\n');

  } catch (error) {
    console.error('Request handler error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    }
  }
}

// Connection management for graceful shutdown
function trackConnection(socket) {
  activeConnections.add(socket);
  
  socket.on('close', () => {
    activeConnections.delete(socket);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    activeConnections.delete(socket);
    socket.destroy();
  });

  // Set socket timeout
  socket.setTimeout(SOCKET_TIMEOUT, () => {
    console.log('Socket timeout, closing connection');
    socket.destroy();
  });

  // Handle premature socket close
  socket.on('close', (hadError) => {
    if (hadError) {
      console.log('Socket closed with error');
    }
    activeConnections.delete(socket);
  });
}

// Create and configure the server
const server = http.createServer(handleRequest);

// Configure server timeouts
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
server.headersTimeout = HEADERS_TIMEOUT;
server.requestTimeout = REQUEST_TIMEOUT;

// Track all connections
server.on('connection', trackConnection);

// Server error handling
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  }
});

// Graceful shutdown implementation
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}, starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(() => {
    console.log('Server stopped accepting new connections');
  });

  // Set a timeout for forceful shutdown
  const shutdownTimer = setTimeout(() => {
    console.log('Forceful shutdown after timeout');
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);

  // Close all active connections
  let connectionsToClose = activeConnections.size;
  console.log(`Closing ${connectionsToClose} active connections...`);

  if (connectionsToClose === 0) {
    clearTimeout(shutdownTimer);
    console.log('Graceful shutdown completed');
    process.exit(0);
  }

  // Close each connection gracefully
  activeConnections.forEach(socket => {
    socket.end(() => {
      connectionsToClose--;
      console.log(`Connection closed, ${connectionsToClose} remaining`);
      
      if (connectionsToClose === 0) {
        clearTimeout(shutdownTimer);
        console.log('Graceful shutdown completed');
        process.exit(0);
      }
    });

    // Force close if the connection doesn't close gracefully within 2 seconds
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }, 2000);
  });
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle shutdown on Windows
if (process.platform === 'win32') {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log('Press Ctrl+C to gracefully shutdown');
  console.log(`Process ID: ${process.pid}`);
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  
  // Try to shutdown gracefully, but don't wait too long
  if (!isShuttingDown) {
    isShuttingDown = true;
    setTimeout(() => {
      console.error('Forcing exit due to uncaught exception');
      process.exit(1);
    }, 1000);
    
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack trace:', reason && reason.stack);
  
  // Don't exit on unhandled rejections, just log them
  // In production, you might want to track these for monitoring
});

// Handle process warnings
process.on('warning', (warning) => {
  console.warn('Process warning:', warning.name, warning.message);
  if (warning.stack) {
    console.warn('Stack trace:', warning.stack);
  }
});

// Cleanup function for testing purposes (not typically needed in production)
function cleanup() {
  if (server.listening) {
    server.close();
  }
  activeConnections.forEach(socket => {
    socket.destroy();
  });
  activeConnections.clear();
}
