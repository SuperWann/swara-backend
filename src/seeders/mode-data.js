const { SkorSwaraMode } = require("../models");

const modeData = [
  {
    mode_id: 1,
    mode_name: "Latihan Teks",
    mode_type: "text",
    description: "Latihan public speaking dengan membaca dan menyampaikan teks yang telah disediakan. Anda dapat memilih topik tertentu atau mendapatkan topik secara acak.",
    icon: "📝",
    is_active: true,
  },
  {
    mode_id: 2,
    mode_name: "Latihan Gambar",
    mode_type: "image",
    description: "Latihan mendeskripsikan gambar yang ditampilkan. Topik gambar akan dipilih secara acak untuk melatih kemampuan improvisasi dan deskripsi visual Anda.",
    icon: "🖼️",
    is_active: true,
  },
  {
    mode_id: 3,
    mode_name: "Topik Kustom",
    mode_type: "custom",
    description: "Latihan dengan topik pilihan Anda sendiri. Anda dapat memilih dari topik yang tersedia atau membuat topik baru. Sistem AI akan menghasilkan kriteria penilaian berdasarkan topik yang Anda pilih.",
    icon: "✨",
    is_active: true,
  },
];

const seedModes = async () => {
  try {
    console.log("🌱 Seeding Skor Swara Modes...");

    for (const mode of modeData) {
      const [modeInstance, created] = await SkorSwaraMode.findOrCreate({
        where: { mode_id: mode.mode_id },
        defaults: mode,
      });

      if (created) {
        console.log(`✅ Created mode: ${mode.mode_name}`);
      } else {
        // Update existing mode
        await modeInstance.update(mode);
        console.log(`🔄 Updated mode: ${mode.mode_name}`);
      }
    }

    console.log("✨ Skor Swara Modes seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding Skor Swara Modes:", error.message);
    throw error;
  }
};

module.exports = { seedModes };
