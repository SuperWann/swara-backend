/**
 * Run all seeders for school partnership feature
 */

const seedSchoolPackages = require('./school-packages-data');
const { sequelize } = require('../models');

async function runSchoolSeeders() {
  try {
    console.log('🚀 Starting school partnership seeders...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Run school packages seeder
    await seedSchoolPackages();

    console.log('\n✅ All school seeders completed successfully!');
    console.log('\n📦 School Packages Summary:');
    console.log('   - Paket A: < 100 siswa, max 3 mentor, Rp 20.000/bulan');
    console.log('   - Paket B: 100-350 siswa, max 10 mentor, Rp 17.000/bulan');
    console.log('   - Paket C: 100-350 siswa, max 5 mentor, Rp 15.000/bulan');
    console.log('   - Paket D: 350-500 siswa, max 10 mentor, Rp 12.500/bulan');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runSchoolSeeders();
}

module.exports = runSchoolSeeders;
