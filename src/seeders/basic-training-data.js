const {
  BasicTrainingMode,
  BasicTrainingLevel,
  sequelize,
} = require("../models");

async function seedBasicTrainingData() {
  const transaction = await sequelize.transaction();

  try {
    console.log("Starting basic training data seeding...");

    // Clear existing data
    await BasicTrainingLevel.destroy({ where: {}, transaction });
    await BasicTrainingMode.destroy({ where: {}, transaction });

    // Insert modes
    const modes = await BasicTrainingMode.bulkCreate(
      [
        {
          name: "Latihan Dasar Artikulasi",
          slug: "artikulasi",
          description: "Tingkatkan ketepatan pengucapan dan diksi Anda",
          icon: "microphone",
          color: "#3B82F6",
          order_index: 1,
          is_active: true,
        },
        {
          name: "Latihan Dasar Ekspresi",
          slug: "ekspresi",
          description: "Kuasai ekspresi wajah dan bahasa tubuh",
          icon: "smile",
          color: "#F97316",
          order_index: 2,
          is_active: true,
        },
        {
          name: "Latihan Dasar Tempo",
          slug: "tempo",
          description: "Kendalikan kecepatan dan ritme bicara Anda",
          icon: "clock",
          color: "#EF4444",
          order_index: 3,
          is_active: true,
        },
      ],
      { transaction }
    );

    console.log(`✓ ${modes.length} modes created`);

    // Get mode IDs
    const artikulasiMode = modes[0];
    const ekspresiMode = modes[1];
    const tempoMode = modes[2];

    // Insert levels for Artikulasi
    const artikulasiLevels = await BasicTrainingLevel.bulkCreate(
      [
        {
          basic_training_mode_id: artikulasiMode.basic_training_mode_id,
          level: 1,
          name: "Pengenalan Vokal",
          description: "Berlatih melafalkan huruf vokal dengan jelas",
          minimum_score: 60,
          instruction: "Ucapkan setiap huruf vokal dengan jelas dan perlahan",
          order_index: 1,
          is_active: true,
        },
        {
          basic_training_mode_id: artikulasiMode.basic_training_mode_id,
          level: 2,
          name: "Konsonan Dasar",
          description: "Pelafalan huruf konsonan",
          minimum_score: 65,
          instruction: "Fokus pada pelafalan konsonan yang tepat",
          order_index: 2,
          is_active: true,
        },
        {
          basic_training_mode_id: artikulasiMode.basic_training_mode_id,
          level: 3,
          name: "Kombinasi Suku Kata",
          description: "Gabungan vokal dan konsonan",
          minimum_score: 70,
          instruction: "Gabungkan vokal dan konsonan dengan lancar",
          order_index: 3,
          is_active: true,
        },
        {
          basic_training_mode_id: artikulasiMode.basic_training_mode_id,
          level: 4,
          name: "Kata Sulit",
          description: "Melafalkan kata yang sulit",
          minimum_score: 75,
          instruction:
            "Ucapkan kata-kata sulit dengan artikulasi yang baik",
          order_index: 4,
          is_active: true,
        },
        {
          basic_training_mode_id: artikulasiMode.basic_training_mode_id,
          level: 5,
          name: "Kalimat Kompleks",
          description: "Melafalkan kalimat panjang",
          minimum_score: 80,
          instruction:
            "Pertahankan artikulasi yang baik dalam kalimat panjang",
          order_index: 5,
          is_active: true,
        },
      ],
      { transaction }
    );

    console.log(`✓ ${artikulasiLevels.length} Artikulasi levels created`);

    // Insert levels for Ekspresi
    const ekspresiLevels = await BasicTrainingLevel.bulkCreate(
      [
        {
          basic_training_mode_id: ekspresiMode.basic_training_mode_id,
          level: 1,
          name: "Ekspresi Bahagia",
          description: "Berlatih menunjukkan kegembiraan yang natural",
          minimum_score: 60,
          instruction: "Tunjukkan ekspresi bahagia dengan tulus",
          order_index: 1,
          is_active: true,
        },
        {
          basic_training_mode_id: ekspresiMode.basic_training_mode_id,
          level: 2,
          name: "Ekspresi Serius",
          description: "Ekspresi formal dan serius",
          minimum_score: 65,
          instruction: "Tampilkan ekspresi serius namun tetap menarik",
          order_index: 2,
          is_active: true,
        },
        {
          basic_training_mode_id: ekspresiMode.basic_training_mode_id,
          level: 3,
          name: "Kontak Mata",
          description: "Latihan kontak mata yang baik",
          minimum_score: 70,
          instruction: "Jaga kontak mata dengan kamera",
          order_index: 3,
          is_active: true,
        },
        {
          basic_training_mode_id: ekspresiMode.basic_training_mode_id,
          level: 4,
          name: "Gestur Tangan",
          description: "Menggunakan gestur tangan yang tepat",
          minimum_score: 75,
          instruction: "Gunakan gestur tangan untuk memperkuat pesan",
          order_index: 4,
          is_active: true,
        },
        {
          basic_training_mode_id: ekspresiMode.basic_training_mode_id,
          level: 5,
          name: "Kombinasi Ekspresi",
          description: "Gabungan semua elemen ekspresi",
          minimum_score: 80,
          instruction:
            "Kombinasikan semua elemen ekspresi dengan harmonis",
          order_index: 5,
          is_active: true,
        },
      ],
      { transaction }
    );

    console.log(`✓ ${ekspresiLevels.length} Ekspresi levels created`);

    // Insert levels for Tempo
    const tempoLevels = await BasicTrainingLevel.bulkCreate(
      [
        {
          basic_training_mode_id: tempoMode.basic_training_mode_id,
          level: 1,
          name: "Tempo Lambat",
          description: "Berlatih dengan kecepatan yang terkontrol",
          minimum_score: 60,
          instruction: "Berbicara dengan tempo lambat dan jelas",
          order_index: 1,
          is_active: true,
        },
        {
          basic_training_mode_id: tempoMode.basic_training_mode_id,
          level: 2,
          name: "Tempo Sedang",
          description: "Kecepatan bicara normal",
          minimum_score: 65,
          instruction: "Gunakan tempo yang natural dan nyaman",
          order_index: 2,
          is_active: true,
        },
        {
          basic_training_mode_id: tempoMode.basic_training_mode_id,
          level: 3,
          name: "Variasi Tempo",
          description: "Mengubah kecepatan bicara",
          minimum_score: 70,
          instruction: "Variasikan tempo untuk menekankan poin penting",
          order_index: 3,
          is_active: true,
        },
        {
          basic_training_mode_id: tempoMode.basic_training_mode_id,
          level: 4,
          name: "Jeda Efektif",
          description: "Menggunakan jeda yang tepat",
          minimum_score: 75,
          instruction: "Gunakan jeda untuk memberikan penekanan",
          order_index: 4,
          is_active: true,
        },
        {
          basic_training_mode_id: tempoMode.basic_training_mode_id,
          level: 5,
          name: "Ritme Presentasi",
          description: "Menguasai ritme presentasi",
          minimum_score: 80,
          instruction: "Kombinasikan tempo dan jeda dengan sempurna",
          order_index: 5,
          is_active: true,
        },
      ],
      { transaction }
    );

    console.log(`✓ ${tempoLevels.length} Tempo levels created`);

    await transaction.commit();
    console.log("\n✓ Basic training data seeded successfully!");
  } catch (error) {
    await transaction.rollback();
    console.error("✗ Error seeding basic training data:", error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedBasicTrainingData()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = seedBasicTrainingData;
