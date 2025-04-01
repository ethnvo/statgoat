// Import Express framework to create the server
const express = require('express');

// Load environment variables from .env file
require('dotenv').config();

// Import CORS middleware to handle cross-origin requests
const cors = require('cors');

// Create an Express application instance
const app = express();

// Import the odds router from the routes directory
const oddsRouter = require('./routes/odds');

// Configure CORS middleware to only allow requests from your Vite frontend
app.use(cors({
  origin: 'http://localhost:5173' // Whitelist your frontend URL
}));

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to parse URL-encoded request bodies (extended mode allows rich objects)
app.use(express.urlencoded({ extended: true }));

// Custom logging middleware - logs all incoming requests
app.use((req, res, next) => {
  // Log timestamp, HTTP method, and request URL
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Pass control to the next middleware/route
});

// Mount the odds router at the /api/odds endpoint
app.use('/api/odds', oddsRouter);

// 404 Handler - catches any requests to undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error-handling middleware - catches any errors in routes
app.use((err, req, res, next) => {
  // Log the full error stack trace to console
  console.error(err.stack);
  // Send generic 500 error to client (don't expose internal errors)
  res.status(500).json({ error: 'Internal Server Error' });
});

// Define the port (use environment variable or default to 3000)
const PORT = process.env.PORT || 3000;

// Start the server and store the server instance
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  // Close the server first to stop accepting new connections
  server.close(() => {
    // Then exit the Node process
    process.exit(0);
  });
});