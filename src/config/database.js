const { ConnectionTimedOutError } = require('sequelize');

require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: 'DB_URL',
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',
    define: {
      timestamps: false,
      underscored: false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  },
  production: {
    use_env_variable: 'DB_URL',
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    timezone: '+07:00',
    define: {
      timestamps: false,
      underscored: false
    },
    pool: { 
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  }
};