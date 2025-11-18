const { SchoolPackage } = require('../models');

/**
 * Seed school packages data
 */
async function seedSchoolPackages() {
  try {
    console.log('Seeding school packages...');

    const packages = [
      {
        package_code: 'A',
        package_name: 'Paket A',
        min_students: 0,
        max_students: 100,
        max_mentors: 3,
        price_per_month: 20000,
        features: [
          'Cocok untuk sekolah kecil',
          'Harga premium',
          'Support penuh'
        ],
        is_active: true
      },
      {
        package_code: 'B',
        package_name: 'Paket B',
        min_students: 100,
        max_students: 350,
        max_mentors: 10,
        price_per_month: 17000,
        features: [
          'Paling populer',
          'Banyak mentor',
          'Harga terbaik'
        ],
        is_active: true
      },
      {
        package_code: 'C',
        package_name: 'Paket C',
        min_students: 100,
        max_students: 350,
        max_mentors: 5,
        price_per_month: 15000,
        features: [
          'Hemat biaya',
          'Mentor cukup',
          'Fleksibel'
        ],
        is_active: true
      },
      {
        package_code: 'D',
        package_name: 'Paket D',
        min_students: 350,
        max_students: 500,
        max_mentors: 10,
        price_per_month: 12500,
        features: [
          'Sekolah besar',
          'Harga termurah',
          'Maksimal mentor'
        ],
        is_active: true
      }
    ];

    // Check if packages already exist
    const existingPackages = await SchoolPackage.count();
    
    if (existingPackages === 0) {
      await SchoolPackage.bulkCreate(packages);
      console.log('✓ School packages seeded successfully');
    } else {
      console.log('✓ School packages already exist, skipping...');
    }

    return true;
  } catch (error) {
    console.error('Error seeding school packages:', error);
    throw error;
  }
}

module.exports = seedSchoolPackages;

// Run seeder if executed directly
if (require.main === module) {
  const { sequelize } = require('../models');
  
  seedSchoolPackages()
    .then(() => {
      console.log('School packages seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('School packages seeding failed:', error);
      process.exit(1);
    });
}
