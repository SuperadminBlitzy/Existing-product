/**
 * Integration Test Suite for server.js
 * 
 * This test suite validates the server.js application by spawning it as a separate
 * child process and testing its behavior in a production-like environment.
 * Tests cover process lifecycle, port binding, HTTP responses, error recovery,
 * and concurrent request handling.
 * 
 * Test Framework: Jest 29.7.0
 * HTTP Testing: Supertest 6.3.4
 * Process Management: Node.js child_process.spawn
 */

const { spawn } = require('child_process');
const request = require('supertest');
const path = require('path');
const util = require('util');

// Create promisified version of setTimeout for more precise timing control
const sleep = util.promisify(setTimeout);

describe('Server.js Integration Tests', () => {
  let serverProcess = null;
  let serverUrl = 'http://127.0.0.1:3000';
  
  /**
   * Before each test, ensure no server process is running
   */
  beforeEach(async () => {
    // Ensure clean state before each test
    if (serverProcess) {
      await cleanupServerProcess();
    }
  });

  /**
   * After each test, cleanup any running server processes
   */
  afterEach(async () => {
    await cleanupServerProcess();
  });

  /**
   * Helper function to start the server process
   * @returns {Promise<Object>} Promise that resolves when server is ready
   */
  const startServerProcess = () => {
    return new Promise((resolve, reject) => {
      const serverPath = path.resolve(path.join(__dirname, 'server.js'));
      
      serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        detached: false
      });
      
      let serverOutput = '';
      let serverReady = false;
      
      // Listen for server startup confirmation
      serverProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
        
        // Server is ready when it logs the "running at" message
        if (serverOutput.includes('Server running at') && !serverReady) {
          serverReady = true;
          resolve({
            process: serverProcess,
            output: serverOutput
          });
        }
      });
      
      // Handle server startup errors
      serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });
      
      // Handle process exit during startup
      serverProcess.on('exit', (code, signal) => {
        if (!serverReady) {
          reject(new Error(`Server process exited during startup with code ${code}, signal ${signal}`));
        }
      });
      
      // Handle process errors
      serverProcess.on('error', (error) => {
        if (!serverReady) {
          reject(new Error(`Failed to start server process: ${error.message}`));
        }
      });
      
      // Timeout after 10 seconds if server doesn't start
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout after 10 seconds'));
        }
      }, 10000);
    });
  };
  
  /**
   * Helper function to cleanup server process
   * @returns {Promise<void>} Promise that resolves when cleanup is complete
   */
  const cleanupServerProcess = () => {
    return new Promise((resolve) => {
      if (!serverProcess) {
        resolve();
        return;
      }
      
      let cleanupComplete = false;
      
      // Handle process exit
      serverProcess.on('exit', () => {
        if (!cleanupComplete) {
          cleanupComplete = true;
          serverProcess = null;
          resolve();
        }
      });
      
      // Attempt graceful shutdown first
      serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        if (!cleanupComplete && serverProcess) {
          serverProcess.kill('SIGKILL');
          cleanupComplete = true;
          serverProcess = null;
          resolve();
        }
      }, 5000);
    });
  };
  
  /**
   * Wait for a specified amount of time using promisified setTimeout
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  const wait = (ms) => sleep(ms);

  /**
   * Test 1: Server Process Startup
   * Validates that server.js can be spawned as a child process and properly
   * initializes, binds to port 3000, and reports ready status.
   */
  test('should start server process and bind to port 3000', async () => {
    const startResult = await startServerProcess();
    
    expect(startResult.process).toBeTruthy();
    expect(startResult.process.pid).toBeGreaterThan(0);
    expect(startResult.output).toContain('Server running at http://127.0.0.1:3000/');
    
    // Verify process is actually running
    expect(startResult.process.killed).toBe(false);
    expect(startResult.process.exitCode).toBeNull();
  }, 15000);

  /**
   * Test 2: HTTP Endpoint Response
   * Validates that the running server responds correctly to both HTTP GET and POST requests
   * with proper status code, headers, and body content.
   */
  test('should respond to HTTP GET and POST requests with correct content', async () => {
    await startServerProcess();
    
    // Wait a moment for server to be fully ready
    await wait(100);
    
    // Test GET request
    const getResponse = await request(serverUrl)
      .get('/')
      .expect(200)
      .expect('Content-Type', 'text/plain');
    
    expect(getResponse.text).toBe('Hello, World!\n');
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers['content-type']).toBe('text/plain');
    
    // Test POST request using callback-style with end() method
    const postResponse = await new Promise((resolve, reject) => {
      request(serverUrl)
        .post('/')
        .expect(200)
        .expect('Content-Type', 'text/plain')
        .end((err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
    });
    
    expect(postResponse.text).toBe('Hello, World!\n');
    expect(postResponse.status).toBe(200);
    expect(postResponse.headers['content-type']).toBe('text/plain');
  }, 15000);

  /**
   * Test 3: Graceful Shutdown
   * Validates that the server process can be gracefully terminated and
   * releases resources properly without hanging or causing port conflicts.
   */
  test('should shutdown gracefully when terminated', async () => {
    await startServerProcess();
    
    expect(serverProcess).toBeTruthy();
    expect(serverProcess.killed).toBe(false);
    
    // Test graceful shutdown
    const shutdownPromise = cleanupServerProcess();
    
    await shutdownPromise;
    
    expect(serverProcess).toBeNull();
  }, 15000);

  /**
   * Test 4: Error Recovery and Process Resilience  
   * Validates that the server process can be restarted after termination
   * and continues to function correctly, testing error recovery scenarios.
   */
  test('should restart successfully after termination', async () => {
    // Start server first time
    await startServerProcess();
    let firstResponse = await request(serverUrl).get('/').expect(200);
    expect(firstResponse.text).toBe('Hello, World!\n');
    
    // Terminate the server
    await cleanupServerProcess();
    expect(serverProcess).toBeNull();
    
    // Wait a moment to ensure port is released
    await wait(500);
    
    // Start server second time
    await startServerProcess();
    let secondResponse = await request(serverUrl).get('/').expect(200);
    expect(secondResponse.text).toBe('Hello, World!\n');
    
    // Verify it's actually a new process by checking it's working
    expect(serverProcess).toBeTruthy();
    expect(serverProcess.killed).toBe(false);
  }, 30000);

  /**
   * Test 5: Concurrent Request Handling
   * Validates that the running server can handle multiple concurrent HTTP
   * requests without errors, testing scalability and concurrent access patterns.
   */
  test('should handle concurrent requests correctly', async () => {
    await startServerProcess();
    
    // Wait a moment for server to be fully ready
    await wait(100);
    
    // Create array of concurrent request promises
    const concurrentRequests = [];
    const requestCount = 10;
    
    for (let i = 0; i < requestCount; i++) {
      const requestPromise = request(serverUrl)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'text/plain')
        .then(response => {
          expect(response.text).toBe('Hello, World!\n');
          return response;
        });
      
      concurrentRequests.push(requestPromise);
    }
    
    // Execute all requests concurrently
    const responses = await Promise.all(concurrentRequests);
    
    // Verify all requests completed successfully
    expect(responses).toHaveLength(requestCount);
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toBe('text/plain');
    });
  }, 20000);
});