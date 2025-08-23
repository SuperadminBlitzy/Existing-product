const express = require('express');

const hostname = '127.0.0.1';
const port = 3000;

// Create Express application instance
const app = express();

// Define route for root endpoint - returns "Hello world" (as specified)
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('Hello world');
});

// Define route for evening endpoint - returns "Good evening"
app.get('/evening', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('Good evening');
});

// Start server using Express listen method
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
