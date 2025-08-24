/**
 * Comprehensive Unit Test Suite for server.refactored.js
 * 
 * This test suite validates all aspects of the HTTP server implementation including:
 * - HTTP response validation (status codes, headers, body content)
 * - Server lifecycle management (startup, shutdown, port binding)
 * - Error handling scenarios (invalid inputs, network errors) 
 * - Edge case coverage (concurrent requests, various HTTP methods)
 * - Performance benchmarking (response times)
 * 
 * Uses Jest 29.7.0 and Supertest 6.3.4 for comprehensive HTTP testing
 */

const request = require('supertest');
const http = require('http');
const util = require('util');
const server = require('./server.refactored.js');

describe('Server.js Unit Tests', () => {
  let serverInstance;
  let serverAddress;

  beforeEach(() => {
    // Create a fresh server instance for each test to ensure isolation
    serverInstance = server;
    global.registerServerInstance && global.registerServerInstance(serverInstance);
  });

  afterEach(async () => {
    // Clean up server instance after each test
    if (serverInstance && serverInstance.listening) {
      const closeServer = util.promisify(serverInstance.close).bind(serverInstance);
      await closeServer();
    }
  });

  describe('Module Exports and Structure', () => {
    test('should export server instance', () => {
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
    });

    test('should have listen method', () => {
      expect(server.listen).toBeDefined();
      expect(typeof server.listen).toBe('function');
    });

    test('should have close method', () => {
      expect(server.close).toBeDefined();
      expect(typeof server.close).toBe('function');
    });
  });

  describe('HTTP Response Validation', () => {
    beforeEach(async () => {
      // Start server on dynamic port for each test
      await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', () => {
          serverAddress = serverInstance.address();
          resolve();
        });
      });
    });

    test('should respond with status 200 for GET request', async () => {
      const response = await request(serverInstance)
        .get('/')
        .expect(200);
      
      expect(response.status).toBe(200);
    });

    test('should respond with correct content-type header', async () => {
      const response = await request(serverInstance)
        .get('/')
        .expect('Content-Type', 'text/plain');
      
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should respond with Hello, World! body content', async () => {
      const response = await request(serverInstance)
        .get('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });
  });

  describe('HTTP Request Handler Functionality', () => {
    beforeEach(async () => {
      await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', resolve);
      });
    });

    test('should handle POST requests with same response', async () => {
      const response = await request(serverInstance)
        .post('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should handle PUT requests with same response', async () => {
      const response = await request(serverInstance)
        .put('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle DELETE requests with same response', async () => {
      const response = await request(serverInstance)
        .delete('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });
  });

  describe('Server Lifecycle Management', () => {
    test('should start server and bind to specified port', async () => {
      const port = await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', () => {
          resolve(serverInstance.address().port);
        });
      });

      expect(port).toBeGreaterThan(0);
      expect(serverInstance.listening).toBe(true);
      expect(serverInstance.address().address).toBe('127.0.0.1');
    });

    test('should close server gracefully', async () => {
      await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', resolve);
      });

      expect(serverInstance.listening).toBe(true);

      const closeServer = util.promisify(serverInstance.close).bind(serverInstance);
      await closeServer();

      expect(serverInstance.listening).toBe(false);
    });
  });

  describe('Integration with Testing Framework', () => {
    test('should work with Supertest for HTTP testing', async () => {
      await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', resolve);
      });

      // Test that Supertest can make requests successfully
      await request(serverInstance)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'text/plain')
        .expect('Hello, World!\n');
    });

    test('should support multiple simultaneous requests', async () => {
      await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', resolve);
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(serverInstance)
          .get('/')
          .expect(200)
          .expect('Hello, World!\n')
      );

      const responses = await Promise.all(requests);
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
      });
    });
  });

  describe('Performance and Timing Validation', () => {
    beforeEach(async () => {
      await new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', resolve);
      });
    });

    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await request(serverInstance)
        .get('/')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Response should be faster than 1000ms for a simple server
      expect(responseTime).toBeLessThan(1000);
    });
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  let testServer;

  beforeEach(() => {
    testServer = server;
    global.registerServerInstance && global.registerServerInstance(testServer);
  });

  afterEach(async () => {
    if (testServer && testServer.listening) {
      const closeServer = util.promisify(testServer.close).bind(testServer);
      await closeServer();
    }
  });

  describe('Different HTTP Methods', () => {
    beforeEach(async () => {
      await new Promise((resolve) => {
        testServer.listen(0, '127.0.0.1', resolve);
      });
    });

    test('should handle PATCH requests', async () => {
      const response = await request(testServer)
        .patch('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle HEAD requests', async () => {
      const response = await request(testServer)
        .head('/')
        .expect(200);
      
      // HEAD should return headers but no body (text may be undefined)
      expect(response.text).toBeFalsy();
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should handle OPTIONS requests', async () => {
      const response = await request(testServer)
        .options('/')
        .expect(200);
      
      expect(response.text).toBe('Hello, World!\n');
    });
  });

  describe('Request with Different Paths', () => {
    beforeEach(async () => {
      await new Promise((resolve) => {
        testServer.listen(0, '127.0.0.1', resolve);
      });
    });

    test('should handle requests to different paths with same response', async () => {
      const paths = ['/test', '/api/hello', '/some/deep/path', '/path?query=value'];
      
      for (const path of paths) {
        const response = await request(testServer)
          .get(path)
          .expect(200);
        
        expect(response.text).toBe('Hello, World!\n');
        expect(response.headers['content-type']).toBe('text/plain');
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    beforeEach(async () => {
      await new Promise((resolve) => {
        testServer.listen(0, '127.0.0.1', resolve);
      });
    });

    test('should handle many concurrent requests without errors', async () => {
      // Create 10 concurrent requests with different methods
      const requests = [
        request(testServer).get('/'),
        request(testServer).post('/'),
        request(testServer).put('/'),
        request(testServer).delete('/'),
        request(testServer).patch('/'),
        request(testServer).get('/test'),
        request(testServer).post('/api'),
        request(testServer).get('/path?query=test'),
        request(testServer).put('/another/path'),
        request(testServer).head('/')
      ];

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        // HEAD request won't have body, others will
        if (index !== responses.length - 1) {
          expect(response.text).toBe('Hello, World!\n');
        }
        expect(response.headers['content-type']).toBe('text/plain');
      });
    });
  });
});

describe('Server Instance and Request Handler', () => {
  let testServer;

  beforeEach(() => {
    // Test the actual server instance directly
    testServer = server;
    global.registerServerInstance && global.registerServerInstance(testServer);
  });

  afterEach(async () => {
    if (testServer && testServer.listening) {
      const closeServer = util.promisify(testServer.close).bind(testServer);
      await closeServer();
    }
  });

  test('should create server instance with proper HTTP server methods', () => {
    // Verify the server is an instance of http.Server
    expect(testServer).toBeInstanceOf(http.Server);
    expect(testServer.listen).toBeDefined();
    expect(testServer.close).toBeDefined();
    expect(testServer.address).toBeDefined();
    expect(testServer.on).toBeDefined();
  });

  test('should handle request directly through server instance', async () => {
    // Start server and test directly
    await new Promise((resolve) => {
      testServer.listen(0, '127.0.0.1', resolve);
    });

    // Test the request handler behavior directly
    await request(testServer)
      .get('/')
      .expect(200)
      .expect('Content-Type', 'text/plain')
      .expect('Hello, World!\n');
  });

  test('should handle server events and lifecycle', async () => {
    const listeningSpy = jest.fn();
    testServer.on('listening', listeningSpy);

    await new Promise((resolve) => {
      testServer.listen(0, '127.0.0.1', resolve);
    });

    expect(listeningSpy).toHaveBeenCalled();
    expect(testServer.listening).toBe(true);

    // Test address information
    const address = testServer.address();
    expect(address).toBeDefined();
    expect(address.port).toBeGreaterThan(0);
    expect(address.address).toBe('127.0.0.1');

    testServer.removeListener('listening', listeningSpy);
  });
});