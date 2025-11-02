const { SkorSwaraTopic } = require('../models');

const skorSwaraTopics = [
  {
    topic: "Perkenalan Diri",
    text: "Halo, perkenalkan nama saya [nama]. Saya adalah seorang [pekerjaan/status]. Saya memiliki minat yang besar dalam [bidang minat]. Hobi saya adalah [hobi]. Saya sangat antusias untuk berbagi dan belajar bersama kalian hari ini."
  },
  {
    topic: "Pentingnya Pendidikan",
    text: "Pendidikan adalah kunci untuk membuka pintu kesuksesan. Melalui pendidikan, kita dapat mengembangkan potensi diri dan meningkatkan kualitas hidup. Pendidikan tidak hanya tentang akademis, tetapi juga tentang membangun karakter dan nilai-nilai positif dalam diri kita."
  },
  {
    topic: "Manfaat Olahraga",
    text: "Olahraga sangat penting untuk kesehatan fisik dan mental kita. Dengan berolahraga secara teratur, kita dapat menjaga kebugaran tubuh, meningkatkan stamina, dan mengurangi stres. Olahraga juga membantu kita untuk lebih disiplin dan memiliki pola hidup yang lebih sehat."
  },
  {
    topic: "Teknologi di Era Modern",
    text: "Teknologi telah mengubah cara kita hidup dan bekerja. Di era digital ini, hampir semua aspek kehidupan kita tersentuh oleh teknologi. Mulai dari komunikasi, pendidikan, hingga bisnis, semuanya menjadi lebih efisien dan mudah diakses berkat perkembangan teknologi yang pesat."
  },
  {
    topic: "Menjaga Lingkungan",
    text: "Lingkungan adalah aset berharga yang harus kita jaga bersama. Dengan menjaga kebersihan lingkungan, kita turut berkontribusi dalam menciptakan kehidupan yang lebih sehat dan berkelanjutan. Mari mulai dari hal kecil seperti membuang sampah pada tempatnya dan mengurangi penggunaan plastik."
  },
  {
    topic: "Kerja Tim yang Efektif",
    text: "Kerja sama tim adalah kunci kesuksesan dalam mencapai tujuan bersama. Dalam sebuah tim, komunikasi yang baik dan saling menghargai pendapat adalah hal yang sangat penting. Setiap anggota tim memiliki peran yang sama pentingnya dalam mencapai hasil yang optimal."
  },
  {
    topic: "Mengatasi Rasa Gugup",
    text: "Gugup adalah hal yang wajar dialami oleh setiap orang, terutama saat berbicara di depan umum. Untuk mengatasi rasa gugup, kita perlu mempersiapkan diri dengan baik, berlatih secara rutin, dan menanamkan kepercayaan diri. Ingat, setiap orang pernah mengalami hal yang sama."
  },
  {
    topic: "Pentingnya Membaca",
    text: "Membaca adalah jendela dunia yang membuka wawasan dan pengetahuan kita. Dengan membaca, kita dapat belajar banyak hal baru tanpa harus mengalaminya secara langsung. Kebiasaan membaca juga dapat meningkatkan kreativitas dan kemampuan berpikir kritis kita."
  },
  {
    topic: "Manajemen Waktu",
    text: "Waktu adalah sumber daya yang sangat berharga dan tidak dapat diulang. Dengan manajemen waktu yang baik, kita dapat menyelesaikan tugas dengan lebih efektif dan efisien. Buatlah prioritas, rencanakan kegiatan, dan hindari prokrastinasi untuk memanfaatkan waktu dengan optimal."
  },
  {
    topic: "Kewirausahaan",
    text: "Menjadi seorang wirausaha membutuhkan keberanian, kreativitas, dan ketekunan. Wirausaha tidak hanya tentang mencari keuntungan, tetapi juga tentang menciptakan solusi untuk masalah yang ada di masyarakat. Kegagalan adalah bagian dari proses pembelajaran menuju kesuksesan."
  },
  {
    topic: "Bahasa sebagai Alat Komunikasi",
    text: "Bahasa adalah alat komunikasi utama yang menghubungkan manusia satu sama lain. Kemampuan berbahasa yang baik sangat penting dalam kehidupan sehari-hari, baik untuk keperluan pribadi maupun profesional. Dengan menguasai bahasa, kita dapat menyampaikan ide dan perasaan dengan lebih efektif."
  },
  {
    topic: "Dampak Media Sosial",
    text: "Media sosial telah menjadi bagian tak terpisahkan dari kehidupan modern. Media sosial memiliki dampak positif seperti memudahkan komunikasi dan berbagi informasi. Namun, kita juga perlu bijak dalam menggunakannya agar tidak menimbulkan dampak negatif bagi diri kita dan orang lain."
  },
  {
    topic: "Kesehatan Mental",
    text: "Kesehatan mental sama pentingnya dengan kesehatan fisik. Stres, kecemasan, dan depresi adalah masalah yang sering diabaikan. Penting bagi kita untuk memperhatikan kesehatan mental dengan cara beristirahat cukup, melakukan aktivitas yang disukai, dan tidak ragu meminta bantuan profesional jika diperlukan."
  },
  {
    topic: "Budaya Indonesia",
    text: "Indonesia memiliki kekayaan budaya yang sangat beragam. Setiap daerah memiliki keunikan tersendiri, mulai dari bahasa, tarian, musik, hingga kuliner. Sebagai generasi muda, kita memiliki tanggung jawab untuk melestarikan dan memperkenalkan budaya Indonesia kepada dunia."
  },
  {
    topic: "Inovasi dan Kreativitas",
    text: "Inovasi dan kreativitas adalah kunci untuk menghadapi tantangan di masa depan. Dengan berpikir kreatif, kita dapat menemukan solusi baru untuk masalah yang ada. Jangan takut untuk mencoba hal-hal baru dan belajar dari kegagalan, karena itulah bagian dari proses inovasi."
  }
];

async function seedSkorSwaraData() {
  try {
    console.log('Starting Skor Swara topics seeding...');

    // Clear existing data
    await SkorSwaraTopic.destroy({ where: {} });
    console.log('Cleared existing Skor Swara topics');

    // Insert topics
    for (const topic of skorSwaraTopics) {
      await SkorSwaraTopic.create(topic);
    }

    console.log(`Successfully seeded ${skorSwaraTopics.length} Skor Swara topics`);
  } catch (error) {
    console.error('Error seeding Skor Swara data:', error);
    throw error;
  }
}

module.exports = { seedSkorSwaraData };
