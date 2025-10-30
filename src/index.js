require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Swara Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
let routes;
try {
  routes = require('./routes');
  app.use('/api/swara', routes);
} catch (error) {
  console.warn('Routes not loaded yet:', error.message);
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    const { sequelize } = require('./models');
    const seedInitialData = require('./seeders/init-data');
    const seedInspiraData = require('./seeders/inspira-data');
    const seedAduSwaraData = require('./seeders/adu-swara-data');
    const seedPodiumData = require('./seeders/podium-data');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting Swara Backend Server...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Test database connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync models
    console.log('📊 Synchronizing database models...');
    await sequelize.sync({ alter: false, force: false });
    console.log('✓ Database models synchronized');

    // Seed initial data
    await seedInitialData(sequelize);
    await seedInspiraData(sequelize);
    await seedAduSwaraData(sequelize);
    await seedPodiumData(sequelize);

    // Start server
    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API URL: http://localhost:${PORT}/api/swara`);
      console.log(`✓ Health Check: http://localhost:${PORT}/`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ Unable to start server');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.error('\n⚠️  Database connection failed!');
      console.error('Please check:');
      console.error('  1. MySQL server is running');
      console.error('  2. Database credentials in .env are correct');
      console.error('  3. Database exists:');
      console.error(`     CREATE DATABASE ${process.env.DB_NAME};`);
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('\n⚠️  Database error!');
      console.error('Try dropping and recreating the database:');
      console.error(`  DROP DATABASE IF EXISTS ${process.env.DB_NAME};`);
      console.error(`  CREATE DATABASE ${process.env.DB_NAME};`);
    }
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
};

startServer();

module.exports = app;