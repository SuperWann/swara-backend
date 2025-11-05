const { SkorSwaraImage, SkorSwaraTopic } = require("../models");

const imageData = [
  // Topic 1: Perubahan Iklim
  {
    skor_swara_topic_id: 1,
    image_url: "/uploads/images/climate-change-1.jpg",
    image_description: "Grafik peningkatan suhu global selama 100 tahun terakhir",
    is_active: true,
  },
  {
    skor_swara_topic_id: 1,
    image_url: "/uploads/images/climate-change-2.jpg",
    image_description: "Dampak perubahan iklim pada es kutub yang mencair",
    is_active: true,
  },
  {
    skor_swara_topic_id: 1,
    image_url: "/uploads/images/climate-change-3.jpg",
    image_description: "Bencana alam akibat perubahan iklim",
    is_active: true,
  },
  
  // Topic 2: Teknologi Digital
  {
    skor_swara_topic_id: 2,
    image_url: "/uploads/images/digital-tech-1.jpg",
    image_description: "Smartphone dan perangkat digital modern",
    is_active: true,
  },
  {
    skor_swara_topic_id: 2,
    image_url: "/uploads/images/digital-tech-2.jpg",
    image_description: "Orang menggunakan teknologi dalam kehidupan sehari-hari",
    is_active: true,
  },
  
  // Topic 3: Pendidikan
  {
    skor_swara_topic_id: 3,
    image_url: "/uploads/images/education-1.jpg",
    image_description: "Ruang kelas modern dengan teknologi",
    is_active: true,
  },
  {
    skor_swara_topic_id: 3,
    image_url: "/uploads/images/education-2.jpg",
    image_description: "Siswa belajar secara online",
    is_active: true,
  },
  {
    skor_swara_topic_id: 3,
    image_url: "/uploads/images/education-3.jpg",
    image_description: "Perpustakaan digital dan e-learning",
    is_active: true,
  },
  
  // Topic 4: Kesehatan Mental
  {
    skor_swara_topic_id: 4,
    image_url: "/uploads/images/mental-health-1.jpg",
    image_description: "Seseorang melakukan meditasi untuk kesehatan mental",
    is_active: true,
  },
  {
    skor_swara_topic_id: 4,
    image_url: "/uploads/images/mental-health-2.jpg",
    image_description: "Konseling dan dukungan kesehatan mental",
    is_active: true,
  },
  
  // Topic 5: Ekonomi Kreatif
  {
    skor_swara_topic_id: 5,
    image_url: "/uploads/images/creative-economy-1.jpg",
    image_description: "UMKM dan usaha kreatif lokal",
    is_active: true,
  },
  {
    skor_swara_topic_id: 5,
    image_url: "/uploads/images/creative-economy-2.jpg",
    image_description: "Produk hasil karya industri kreatif",
    is_active: true,
  },
  {
    skor_swara_topic_id: 5,
    image_url: "/uploads/images/creative-economy-3.jpg",
    image_description: "Pasar online untuk produk kreatif",
    is_active: true,
  },
];

const seedImages = async () => {
  try {
    console.log("🌱 Seeding Skor Swara Images...");

    // Check if topics exist first
    const topicCount = await SkorSwaraTopic.count();
    if (topicCount === 0) {
      console.log("⚠️  No topics found. Please seed topics first before seeding images.");
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const image of imageData) {
      // Check if topic exists
      const topicExists = await SkorSwaraTopic.findByPk(image.skor_swara_topic_id);
      
      if (!topicExists) {
        console.log(`⚠️  Topic ID ${image.skor_swara_topic_id} not found, skipping image`);
        skipped++;
        continue;
      }

      // Check if image already exists
      const existingImage = await SkorSwaraImage.findOne({
        where: {
          skor_swara_topic_id: image.skor_swara_topic_id,
          image_url: image.image_url,
        },
      });

      if (!existingImage) {
        await SkorSwaraImage.create(image);
        created++;
        console.log(`✅ Created image for topic ${image.skor_swara_topic_id}: ${image.image_url}`);
      } else {
        // Update existing image
        await existingImage.update({
          image_description: image.image_description,
          is_active: image.is_active,
        });
        skipped++;
        console.log(`🔄 Updated image: ${image.image_url}`);
      }
    }

    console.log(`✨ Skor Swara Images seeding completed! (${created} created, ${skipped} skipped/updated)`);
  } catch (error) {
    console.error("❌ Error seeding Skor Swara Images:", error.message);
    throw error;
  }
};

module.exports = { seedImages };
