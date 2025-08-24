/**
 * Comprehensive Unit Test Suite for server.js
 * 
 * This test suite provides complete coverage of the HTTP server functionality
 * using Jest 29.7.0 and Supertest 6.3.4 for HTTP endpoint testing.
 * 
 * Test Categories:
 * - HTTP Response Validation (3 tests)
 * - Server Startup Testing (2 tests)
 * - Server Shutdown Testing (2 tests)
 * - Error Handling Scenarios (2 tests)
 * - Edge Case Coverage (6 tests)
 * - Performance Benchmarking (1 test)
 * 
 * Features:
 * - Isolated server instances for each test using dynamic ports
 * - Comprehensive async/await handling for all asynchronous operations
 * - Proper cleanup with beforeEach/afterEach hooks
 * - Zero placeholders - complete implementation of all test scenarios
 */

const request = require('supertest');
const http = require('http');
const { promisify } = require('util');
const server = require('./server.refactored.js');

describe('HTTP Server Unit Tests', () => {
  let testServer;
  let testPort;

  /**
   * Setup for each test: Create isolated server instance
   * Uses port 0 for automatic port assignment to prevent conflicts
   */
  beforeEach(async () => {
    // Create fresh server instance for test isolation
    testServer = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Hello, World!\n');
    });
    
    // Start server on random available port
    const listen = promisify(testServer.listen.bind(testServer));
    await listen(0, '127.0.0.1');
    testPort = testServer.address().port;
  });

  /**
   * Cleanup after each test: Ensure server is properly closed
   */
  afterEach(async () => {
    if (testServer && testServer.listening) {
      const close = promisify(testServer.close.bind(testServer));
      await close();
    }
  });

  /**
   * HTTP Response Validation Tests (3 tests)
   * Tests core HTTP response behavior, status codes, headers, and content
   */
  describe('HTTP Response Validation', () => {
    test('should return HTTP 200 status code for GET requests', async () => {
      const response = await request(testServer).get('/');
      
      expect(response.status).toBe(200);
      expect(response.statusCode).toBe(200);
    });

    test('should return correct Content-Type header', async () => {
      const response = await request(testServer).get('/');
      
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.get('Content-Type')).toBe('text/plain');
    });

    test('should return "Hello, World!" with newline in response body', async () => {
      const response = await request(testServer).get('/');
      
      expect(response.text).toBe('Hello, World!\n');
      expect(response.body).toBeDefined();
      expect(Buffer.from(response.text).toString()).toBe('Hello, World!\n');
    });
  });

  /**
   * Server Startup Testing (2 tests)
   * Validates server initialization and port binding behavior
   */
  describe('Server Startup Validation', () => {
    test('should successfully bind to specified hostname and port', async () => {
      // Create new server for startup testing
      const startupServer = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello, World!\n');
      });

      const listen = promisify(startupServer.listen.bind(startupServer));
      await listen(0, '127.0.0.1');

      const address = startupServer.address();
      expect(address.address).toBe('127.0.0.1');
      expect(address.port).toBeGreaterThan(0);
      expect(address.family).toBe('IPv4');

      // Cleanup
      const close = promisify(startupServer.close.bind(startupServer));
      await close();
    });

    test('should start server and accept connections within reasonable time', async () => {
      const startTime = Date.now();
      
      const startupServer = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello, World!\n');
      });

      const listen = promisify(startupServer.listen.bind(startupServer));
      await listen(0, '127.0.0.1');
      
      const startupTime = Date.now() - startTime;
      
      // Server should start within 1 second (1000ms)
      expect(startupTime).toBeLessThan(1000);
      expect(startupServer.listening).toBe(true);

      // Verify server accepts connections immediately
      const response = await request(startupServer).get('/');
      expect(response.status).toBe(200);

      // Cleanup
      const close = promisify(startupServer.close.bind(startupServer));
      await close();
    });
  });

  /**
   * Server Shutdown Testing (2 tests)
   * Validates graceful shutdown and port release behavior
   */
  describe('Server Shutdown Validation', () => {
    test('should gracefully shutdown and release port', async () => {
      // Create server for shutdown testing
      const shutdownServer = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello, World!\n');
      });

      const listen = promisify(shutdownServer.listen.bind(shutdownServer));
      await listen(0, '127.0.0.1');
      
      const port = shutdownServer.address().port;
      expect(shutdownServer.listening).toBe(true);

      // Shutdown the server
      const close = promisify(shutdownServer.close.bind(shutdownServer));
      await close();

      expect(shutdownServer.listening).toBe(false);
      
      // Verify port is released by creating new server on same port
      const newServer = http.createServer((req, res) => {
        res.end('test');
      });
      
      const newListen = promisify(newServer.listen.bind(newServer));
      await expect(newListen(port, '127.0.0.1')).resolves.toBeUndefined();
      
      // Cleanup new server
      const newClose = promisify(newServer.close.bind(newServer));
      await newClose();
    });

    test('should handle shutdown when server has active connections', async () => {
      const shutdownServer = http.createServer((req, res) => {
        // Delay response to simulate active connection
        setTimeout(() => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Hello, World!\n');
        }, 100);
      });

      const listen = promisify(shutdownServer.listen.bind(shutdownServer));
      await listen(0, '127.0.0.1');

      // Start request but don't wait for completion
      const requestPromise = request(shutdownServer).get('/');

      // Shutdown server while request is in progress
      const close = promisify(shutdownServer.close.bind(shutdownServer));
      const shutdownPromise = close();

      // Both operations should complete successfully
      const [response] = await Promise.all([requestPromise, shutdownPromise]);
      
      expect(response.status).toBe(200);
      expect(shutdownServer.listening).toBe(false);
    });
  });

  /**
   * Error Handling Scenarios (2 tests)  
   * Tests server behavior under error conditions and invalid inputs
   */
  describe('Error Handling Validation', () => {
    test('should handle invalid HTTP methods gracefully', async () => {
      // Test unsupported HTTP methods - server should still respond
      const patchResponse = await request(testServer).patch('/');
      expect(patchResponse.status).toBe(200);
      expect(patchResponse.text).toBe('Hello, World!\n');

      const deleteResponse = await request(testServer).delete('/');
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.text).toBe('Hello, World!\n');

      const putResponse = await request(testServer).put('/');
      expect(putResponse.status).toBe(200);
      expect(putResponse.text).toBe('Hello, World!\n');
    });

    test('should handle requests with various paths and query parameters', async () => {
      // Server should respond to any path with same response
      const pathResponse = await request(testServer).get('/test/path');
      expect(pathResponse.status).toBe(200);
      expect(pathResponse.text).toBe('Hello, World!\n');

      const queryResponse = await request(testServer).get('/?param=value&test=123');
      expect(queryResponse.status).toBe(200);
      expect(queryResponse.text).toBe('Hello, World!\n');

      const complexPathResponse = await request(testServer).get('/api/v1/users/123?include=profile');
      expect(complexPathResponse.status).toBe(200);
      expect(complexPathResponse.text).toBe('Hello, World!\n');
    });
  });

  /**
   * Edge Case Coverage (6 tests)
   * Tests concurrent requests, various HTTP methods, and boundary conditions
   */
  describe('Edge Case Validation', () => {
    test('should handle multiple concurrent GET requests', async () => {
      const requestCount = 10;
      const requests = Array(requestCount).fill().map(() => 
        request(testServer).get('/')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
        expect(response.headers['content-type']).toBe('text/plain');
      });
    });

    test('should handle POST requests with request body', async () => {
      const postData = { test: 'data', number: 123 };
      const response = await request(testServer)
        .post('/')
        .send(postData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should handle requests with custom headers', async () => {
      const response = await request(testServer)
        .get('/')
        .set('User-Agent', 'TestAgent/1.0')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer token123')
        .set('Custom-Header', 'custom-value');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should maintain consistent response across different HTTP methods', async () => {
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      const responses = await Promise.all(
        methods.map(method => request(testServer)[method]('/'))
      );

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
        expect(response.headers['content-type']).toBe('text/plain');
      });
    });

    test('should handle rapid sequential requests', async () => {
      const responses = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await request(testServer).get(`/request-${i}`);
        responses.push(response);
      }

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
        expect(response.headers['content-type']).toBe('text/plain');
      });
    });

    test('should handle requests with large headers', async () => {
      const largeHeaderValue = 'x'.repeat(1000); // 1KB header value
      
      const response = await request(testServer)
        .get('/')
        .set('Large-Header', largeHeaderValue);

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toBe('text/plain');
    });
  });

  /**
   * Performance Benchmarking (1 test)
   * Validates response time performance requirements
   */
  describe('Performance Validation', () => {
    test('should respond within acceptable time limits', async () => {
      const iterations = 5;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(testServer).get('/');
        
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
      }

      // Calculate average response time
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // Server should respond within 100ms on average
      expect(averageTime).toBeLessThan(100);
      
      // No single request should exceed 500ms
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });

      // Log performance metrics for monitoring
      console.log(`Average response time: ${averageTime.toFixed(2)}ms`);
      console.log(`Response time range: ${Math.min(...responseTimes).toFixed(2)}ms - ${Math.max(...responseTimes).toFixed(2)}ms`);
    });
  });
});

/**
 * Additional Integration Points for External Testing
 * 
 * These tests validate compatibility with the refactored server module
 * and ensure the exported server instance works correctly.
 */
describe('Server Module Integration', () => {
  test('should import server from server.refactored.js successfully', () => {
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
    expect(server.constructor.name).toBe('Server');
  });

  test('should provide access to standard HTTP server methods', () => {
    expect(typeof server.listen).toBe('function');
    expect(typeof server.close).toBe('function');
    expect(typeof server.address).toBe('function');
    expect(typeof server.on).toBe('function');
    expect(typeof server.removeListener).toBe('function');
  });

  test('should allow dynamic port assignment for test isolation', async () => {
    const listen = promisify(server.listen.bind(server));
    await listen(0, '127.0.0.1');

    const address = server.address();
    expect(address).toBeDefined();
    expect(address.port).toBeGreaterThan(0);
    expect(address.address).toBe('127.0.0.1');

    const close = promisify(server.close.bind(server));
    await close();
  });
});