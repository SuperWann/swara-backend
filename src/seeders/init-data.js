const bcrypt = require('bcrypt');

async function seedInitialData(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🌱 Seeding initial data...');

    // Seed Roles
    const [roles] = await sequelize.query('SELECT COUNT(*) as count FROM roles');
    if (roles[0].count === 0) {
      await queryInterface.bulkInsert('roles', [
        { role_id: 1, role_name: 'admin' },
        { role_id: 2, role_name: 'user' },
        { role_id: 3, role_name: 'mentor' }
      ]);
      console.log('✓ Roles seeded');
    }

    // Seed Genders
    const [genders] = await sequelize.query('SELECT COUNT(*) as count FROM genders');
    if (genders[0].count === 0) {
      await queryInterface.bulkInsert('genders', [
        { gender_id: 1, gender: 'Laki-laki' },
        { gender_id: 2, gender: 'Perempuan' }
      ]);
      console.log('✓ Genders seeded');
    }

    // Seed Admin User (optional)
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await queryInterface.bulkInsert('users', [{
        full_name: 'Admin',
        email: 'admin@swara.com',
        password: hashedPassword,
        role_id: 1,
        gender_id: null, 
        phone_number: 1234567890,
        birth_date: null,
        address: null,
        created_at: new Date()
      }]);
      console.log('✓ Admin user created (email: admin@swara.com, password: admin123)');
    }

    console.log('✓ Seeding completed successfully');
  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    throw error;
  }
}

module.exports = seedInitialData;