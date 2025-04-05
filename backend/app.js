require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const oddsRouter = require('./routes/odds');

// Initialize Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/odds', oddsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    mongoose.connection.close()
      .then(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
  });
});