require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'swara_backend',
    host: process.env.DB_HOST || 'localhost',
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
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME_TEST || 'swara_backend',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  },
  // production: {
  //   username: process.env.DB_USERNAME,
  //   password: process.env.DB_PASSWORD,
  //   database: process.env.DB_NAME,
  //   host: process.env.DB_HOST,
  //   dialect: 'mysql',
  //   logging: false,
  //   timezone: '+07:00',
  //   pool: {
  //     max: 10,
  //     min: 0,
  //     acquire: 30000,
  //     idle: 10000
  //   }
  // }
};