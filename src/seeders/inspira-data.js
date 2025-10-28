const { 
  CategoryContentSwara, 
  LevelContentSwara, 
  ContentSwara,
  GayaPenyampaian,
  Struktur,
  TeknikPembuka,
  Tag,
  sequelize
} = require('../models');

async function seedInspiraData() {
  const transaction = await sequelize.transaction();

  try {
    console.log('🌱 Starting to seed Inspira Swara data...');

    // 1. Seed Categories
    console.log('📚 Seeding categories...');
    const categories = await CategoryContentSwara.bulkCreate([
      { category_name: 'Public Speaking' },
      { category_name: 'Presentasi Bisnis' },
      { category_name: 'Storytelling' },
      { category_name: 'Debat' },
      { category_name: 'MC & Hosting' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${categories.length} categories seeded`);

    // 2. Seed Levels
    console.log('📊 Seeding levels...');
    const levels = await LevelContentSwara.bulkCreate([
      { level_name: 'Pemula' },
      { level_name: 'Menengah' },
      { level_name: 'Mahir' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${levels.length} levels seeded`);

    // 3. Seed Gaya Penyampaian
    console.log('🎭 Seeding gaya penyampaian...');
    const gayaPenyampaian = await GayaPenyampaian.bulkCreate([
      { gaya_penyampaian: 'Formal' },
      { gaya_penyampaian: 'Informal' },
      { gaya_penyampaian: 'Inspiratif' },
      { gaya_penyampaian: 'Edukatif' },
      { gaya_penyampaian: 'Persuasif' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${gayaPenyampaian.length} gaya penyampaian seeded`);

    // 4. Seed Struktur
    console.log('🏗️ Seeding struktur...');
    const struktur = await Struktur.bulkCreate([
      { struktur: 'Pembukaan' },
      { struktur: 'Isi' },
      { struktur: 'Penutup' },
      { struktur: 'Q&A' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${struktur.length} struktur seeded`);

    // 5. Seed Teknik Pembuka
    console.log('🎬 Seeding teknik pembuka...');
    const teknikPembuka = await TeknikPembuka.bulkCreate([
      { teknik_pembuka: 'Pertanyaan Retoris' },
      { teknik_pembuka: 'Kutipan' },
      { teknik_pembuka: 'Cerita Pribadi' },
      { teknik_pembuka: 'Fakta Mengejutkan' },
      { teknik_pembuka: 'Humor' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${teknikPembuka.length} teknik pembuka seeded`);

    // 6. Seed Tags
    console.log('🏷️ Seeding tags...');
    const tags = await Tag.bulkCreate([
      { tag_name: 'Percaya Diri' },
      { tag_name: 'Body Language' },
      { tag_name: 'Vokal' },
      { tag_name: 'Artikulasi' },
      { tag_name: 'Ekspresi' },
      { tag_name: 'Gestur' },
      { tag_name: 'Kontak Mata' }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${tags.length} tags seeded`);

    // 7. Seed Sample Content
    console.log('📹 Seeding sample content...');
    const contents = await ContentSwara.bulkCreate([
      {
        title: 'Menguasai Public Speaking untuk Pemula',
        thumbnail: 'https://example.com/thumbnails/public-speaking-pemula.jpg',
        url_video: 'https://example.com/videos/public-speaking-pemula.mp4',
        description: 'Pelajari dasar-dasar public speaking yang efektif untuk pemula. Dari persiapan hingga eksekusi presentasi yang menarik.',
        category_content_swara_id: 1,
        level_content_swara_id: 1,
        speaker: 'Dr. Ahmad Rizki',
        video_duration: '00:15:30',
        views: 0
      },
      {
        title: 'Teknik Storytelling yang Memikat Audiens',
        thumbnail: 'https://example.com/thumbnails/storytelling.jpg',
        url_video: 'https://example.com/videos/storytelling.mp4',
        description: 'Belajar bagaimana membuat cerita yang menarik dan memorable untuk presentasi Anda.',
        category_content_swara_id: 3,
        level_content_swara_id: 2,
        speaker: 'Sarah Wulandari',
        video_duration: '00:20:45',
        views: 0
      },
      {
        title: 'Presentasi Bisnis yang Profesional',
        thumbnail: 'https://example.com/thumbnails/presentasi-bisnis.jpg',
        url_video: 'https://example.com/videos/presentasi-bisnis.mp4',
        description: 'Tingkatkan kemampuan presentasi bisnis Anda dengan teknik-teknik profesional.',
        category_content_swara_id: 2,
        level_content_swara_id: 3,
        speaker: 'Prof. Budi Santoso',
        video_duration: '00:25:00',
        views: 0
      }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${contents.length} contents seeded`);

    await transaction.commit();
    console.log('✅ All Inspira Swara data seeded successfully!');
    
    return {
      success: true,
      message: 'Inspira Swara data seeded successfully',
      data: {
        categories: categories.length,
        levels: levels.length,
        gayaPenyampaian: gayaPenyampaian.length,
        struktur: struktur.length,
        teknikPembuka: teknikPembuka.length,
        tags: tags.length,
        contents: contents.length
      }
    };
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error seeding Inspira Swara data:', error);
    throw error;
  }
}

if (require.main === module) {
  seedInspiraData()
    .then(() => {
      console.log('✨ Seeding completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedInspiraData;
