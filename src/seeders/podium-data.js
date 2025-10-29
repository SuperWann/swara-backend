const { 
  PodiumCategory, 
  PodiumText,
  PodiumInterviewQuestion,
  sequelize
} = require('../models');

async function seedPodiumData() {
  const transaction = await sequelize.transaction();

  try {
    console.log('🎯 Starting to seed Podium data...');

    // 1. Seed Podium Categories
    console.log('📚 Seeding podium categories...');
    const categories = await PodiumCategory.bulkCreate([
      { podium_category: 'Wawancara Kerja', is_interview: true },
      { podium_category: 'Pidato', is_interview: false },
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${categories.length} categories seeded`);

    // 2. Seed Podium Texts
    console.log('📝 Seeding podium texts...');
    const texts = await PodiumText.bulkCreate([
      {
        podium_text: 'Di era digital ini, kewirausahaan bukan lagi tentang modal besar, tetapi tentang ide inovatif dan eksekusi yang tepat. Startup teknologi telah membuktikan bahwa dengan solusi yang tepat, bisnis dapat berkembang pesat.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Kolaborasi antara startup dan perusahaan besar menciptakan ekosistem bisnis yang dinamis. Open innovation membuka peluang bagi ide-ide segar untuk berkembang.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Transformasi digital mengubah cara kita bekerja dan berinteraksi. Artificial Intelligence dan Machine Learning bukan lagi masa depan, tetapi sudah menjadi bagian dari kehidupan sehari-hari kita.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Revolusi Industri 4.0 menuntut kita untuk terus belajar dan beradaptasi. Keterampilan digital bukan lagi bonus, tetapi keharusan di dunia kerja modern.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Keberagaman budaya adalah kekayaan bangsa. Dengan saling menghormati dan memahami perbedaan, kita dapat membangun masyarakat yang lebih harmonis dan inklusif.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Media sosial telah mengubah cara kita berkomunikasi. Penting bagi kita untuk menggunakan platform digital secara bijak dan bertanggung jawab.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Pendidikan adalah investasi terbaik untuk masa depan. Metode pembelajaran yang adaptif dan berbasis teknologi memungkinkan setiap orang mendapatkan akses pendidikan berkualitas.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Sistem pendidikan harus lebih fleksibel dan personal. Pembelajaran berbasis proyek dan kolaborasi lebih efektif daripada metode hafalan tradisional.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Perubahan iklim adalah tantangan global yang memerlukan aksi nyata dari setiap individu. Gaya hidup berkelanjutan bukan pilihan, tetapi kebutuhan untuk generasi mendatang.',
        category_id: 2,
        created_at: new Date()
      },
      {
        podium_text: 'Teknologi hijau dan energi terbarukan adalah kunci masa depan yang sustainable. Investasi dalam green technology bukan hanya baik untuk lingkungan, tetapi juga menguntungkan secara ekonomi.',
        category_id: 2,
        created_at: new Date()
      }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${texts.length} podium texts seeded`);

    // 3. Seed Podium Interview Questions
    console.log('❓ Seeding podium interview questions...');
    const questions = await PodiumInterviewQuestion.bulkCreate([
      {
        question: 'Ceritakan tentang diri Anda dan mengapa Anda tertarik dengan posisi ini.',
        answer: 'Saya adalah lulusan [jurusan] dengan pengalaman [X tahun] di bidang [bidang]. Saya tertarik dengan posisi ini karena sesuai dengan passion dan keahlian saya.',
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Apa kekuatan dan kelemahan terbesar Anda?',
        answer: 'Kekuatan saya adalah kemampuan problem solving dan kerja tim. Kelemahan saya adalah terlalu perfeksionis, namun saya terus belajar untuk lebih fleksibel.',
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Ceritakan tentang situasi sulit yang pernah Anda hadapi di tempat kerja dan bagaimana mengatasinya.',
        answer: 'Pernah menghadapi deadline ketat dengan tim yang kurang. Saya menerapkan prioritas tugas, komunikasi intensif, dan kolaborasi efektif untuk menyelesaikannya tepat waktu.',
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Dimana Anda melihat diri Anda 5 tahun ke depan?',
        answer: null,
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Mengapa Anda meninggalkan pekerjaan sebelumnya?',
        answer: null,
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Bagaimana cara Anda menangani kritik atau feedback negatif?',
        answer: null,
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Apa yang membuat Anda unik dibandingkan kandidat lain?',
        answer: null,
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Ceritakan tentang proyek atau pencapaian yang paling Anda banggakan.',
        answer: null,
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Bagaimana Anda bekerja dalam tim?',
        answer: null,
        category_id: 1,
        created_at: new Date()
      },
      {
        question: 'Apa ekspektasi gaji Anda untuk posisi ini?',
        answer: null,
        category_id: 1,
        created_at: new Date()
      }
    ], { transaction, ignoreDuplicates: true });
    console.log(`✅ ${questions.length} podium interview questions seeded`);

    await transaction.commit();
    console.log('✅ All Podium data seeded successfully!');
    
    return {
      success: true,
      message: 'Podium data seeded successfully',
      data: {
        categories: categories.length,
        texts: texts.length,
        questions: questions.length
      }
    };
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error seeding Podium data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedPodiumData()
    .then(() => {
      console.log('✨ Seeding completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedPodiumData;
