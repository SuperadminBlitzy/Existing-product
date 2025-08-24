const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const https = require('https');
const fs = require('fs');

const app = express();

// Configuration
const hostname = '127.0.0.1';
const httpPort = 3000;
const httpsPort = 3443;

// Security middleware configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const corsOptions = {
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply security middleware in proper order
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors(corsOptions));
app.use(limiter);

// Input validation and sanitization middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization helper
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Basic XSS prevention - escape HTML characters
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      }
    });
  }
  next();
};

app.use(sanitizeInput);

// HTTP to HTTPS redirect middleware
app.use((req, res, next) => {
  if (!req.secure && req.get('X-Forwarded-Proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.get('Host')}${req.url}`);
  }
  next();
});

// Main route - preserving original "Hello, World!" functionality
app.get('/', (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/plain');
  res.send('Hello, World!\n');
});

// Catch-all route to maintain original behavior
app.use('*', (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/plain');
  res.send('Hello, World!\n');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500);
  res.setHeader('Content-Type', 'text/plain');
  res.send('Internal Server Error\n');
});

// HTTPS server setup with certificate handling
let httpsServer;
try {
  // Try to read SSL certificates
  const privateKey = fs.readFileSync('./cert/server.key', 'utf8');
  const certificate = fs.readFileSync('./cert/server.cert', 'utf8');
  
  const credentials = {
    key: privateKey,
    cert: certificate
  };
  
  httpsServer = https.createServer(credentials, app);
  
  httpsServer.listen(httpsPort, hostname, () => {
    console.log(`Secure server running at https://${hostname}:${httpsPort}/`);
  });
  
} catch (error) {
  console.warn('HTTPS setup failed - SSL certificates not found in ./cert/ directory');
  console.warn('Generate certificates with: openssl req -x509 -newkey rsa:4096 -keyout ./cert/server.key -out ./cert/server.cert -days 365 -nodes');
  console.warn('Running in HTTP-only mode for now');
}

// HTTP server (always available)
app.listen(httpPort, hostname, () => {
  console.log(`Server running at http://${hostname}:${httpPort}/`);
  if (httpsServer) {
    console.log(`Secure HTTPS server also available at https://${hostname}:${httpsPort}/`);
  }
});
