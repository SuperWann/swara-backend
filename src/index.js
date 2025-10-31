require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();

// Middleware 
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check 
app.get('/', (req, res) => { res.json({ success: true, message: 'Swara Backend API is running', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV }); });

// Routes 
try { const routes = require('./routes'); app.use('/api/swara', routes); } catch (error) { console.warn('Routes not loaded yet:', error.message); }

// 404 
app.use('*', (req, res) => { res.status(404).json({ success: false, message: 'Route not found' }); });

// Error handler 
app.use((err, req, res, next) => { console.error('Error:', err.stack); res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' }); });

module.exports = app;