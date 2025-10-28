const fs = require('fs');
const path = require('path');

const logRequest = (req, res, next) => {
  const logDir = path.join(__dirname, '../../logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}\n`;

  fs.appendFile(logFile, logEntry, (err) => {
    if (err) console.error('Logging error:', err);
  });

  next();
};

module.exports = { logRequest };    