const { 
  AduSwaraCategory, 
  AduSwaraTopic,
  Keyword,
  sequelize
} = require('../models');

async function seedAduSwaraData() {
  const transaction = await sequelize.transaction();

  try {
    console.log('🎤 Starting to seed Adu Swara data...');

    // 1. Seed Categories
    console.log('📚 Seeding adu swara categories...');
    const categories = await AduSwaraCategory.bulkCreate([
      { adu_swara_category: 'Kelancaran & Pengucapan' },
      { adu_swara_category: 'Kontok Mata & Ekspresi' },
      { adu_swara_category: 'Organisasi & Struktur' },
      { adu_swara_category: 'Penggunaan Bahasa' },
      { adu_swara_category: 'Isi & Konten' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${categories.length} categories seeded`);

    // 2. Seed Keywords
    console.log('🏷️ Seeding keywords...');
    const keywords = await Keyword.bulkCreate([
      { keyword: 'komunikasi' },
      { keyword: 'masa depan' },
      { keyword: 'teknologi' },
      { keyword: 'karier' },
      { keyword: 'bisnis' },
      { keyword: 'digital' },
      { keyword: 'inovasi' },
      { keyword: 'kepemimpinan' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${keywords.length} keywords seeded`);

    // 3. Seed Topics
    console.log('📝 Seeding adu swara topics...');
    const topics = await AduSwaraTopic.bulkCreate([
      {
        title: 'Merancang Masa Depan: Membangun Karier di Era Digital',
        adu_swara_category_id: 1,
        created_at: new Date()
      },
      {
        title: 'Strategi Jitu Mengaasai Bisnis Lokal',
        adu_swara_category_id: 2,
        created_at: new Date()
      },
      {
        title: 'Rahasia Tampil Percaya Diri di Depan Banyak Orang',
        adu_swara_category_id: 3,
        created_at: new Date()
      },
      {
        title: 'Mengembangkan Keterampilan Public Speaking',
        adu_swara_category_id: 4,
        created_at: new Date()
      },
      {
        title: 'Teknik Presentasi yang Efektif dan Menarik',
        adu_swara_category_id: 5,
        created_at: new Date()
      }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${topics.length} topics seeded`);

    // 4. Associate keywords with topics (many-to-many)
    // This would require the junction table to be seeded separately if needed
    console.log('🔗 Keywords-Topics association can be added manually via API');

    await transaction.commit();
    console.log('✅ All Adu Swara data seeded successfully!');
    
    return {
      success: true,
      message: 'Adu Swara data seeded successfully',
      data: {
        categories: categories.length,
        keywords: keywords.length,
        topics: topics.length
      }
    };
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error seeding Adu Swara data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedAduSwaraData()
    .then(() => {
      console.log('✨ Seeding completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAduSwaraData;
