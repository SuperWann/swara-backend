const db = require('../models');
const bcrypt = require('bcrypt');

const MetodeMentoring = db.MetodeMentoring;
const User = db.User;
const Role = db.Role;
const MentorProfile = db.MentorProfile;

const seedMentoringData = async () => {
  try {
    console.log('Seeding mentoring data...');

    // 1. Seed Metode Mentoring
    const metodeMentoring = [
      { metode_mentoring: 'Online - Video Call' },
      { metode_mentoring: 'Offline - Tatap Muka' },
      { metode_mentoring: 'Hybrid' }
    ];

    const createdMetode = await MetodeMentoring.bulkCreate(metodeMentoring, {
      ignoreDuplicates: true
    });
    console.log(`✓ Created ${createdMetode.length} metode mentoring`);

    // 2. Get or create mentor role
    let mentorRole = await Role.findOne({ where: { role_name: 'mentor' } });
    if (!mentorRole) {
      mentorRole = await Role.create({ role_name: 'mentor' });
      console.log('✓ Created mentor role');
    }

    // 3. Create mentor users
    const mentorUsers = [
      {
        full_name: 'Dr. Ahmad Fauzi',
        email: 'ahmad.fauzi@mentor.swara.com',
        password: 'password123',
        phone_number: '081234567890',
        role_id: mentorRole.role_id
      },
      {
        full_name: 'Prof. Sarah Wijaya',
        email: 'sarah.wijaya@mentor.swara.com',
        password: 'password123',
        phone_number: '081234567891',
        role_id: mentorRole.role_id
      },
      {
        full_name: 'Budi Santoso, M.Kom',
        email: 'budi.santoso@mentor.swara.com',
        password: 'password123',
        phone_number: '081234567892',
        role_id: mentorRole.role_id
      },
      {
        full_name: 'Dr. Maya Kusuma',
        email: 'maya.kusuma@mentor.swara.com',
        password: 'password123',
        phone_number: '081234567893',
        role_id: mentorRole.role_id
      },
      {
        full_name: 'Andi Prasetyo, S.Psi',
        email: 'andi.prasetyo@mentor.swara.com',
        password: 'password123',
        phone_number: '081234567894',
        role_id: mentorRole.role_id
      }
    ];

    const createdMentors = [];
    for (const mentorData of mentorUsers) {
      const [mentor, created] = await User.findOrCreate({
        where: { email: mentorData.email },
        defaults: mentorData
      });
      createdMentors.push(mentor);
      if (created) {
        console.log(`✓ Created mentor user: ${mentor.full_name}`);
      }
    }

    // 4. Create mentor profiles
    const mentorProfiles = [
      {
        user_id: createdMentors[0].user_id,
        position: 'Public Speaking Expert',
        bio: 'Ahli komunikasi dengan pengalaman 15 tahun dalam melatih public speaking untuk eksekutif dan profesional. Telah melatih lebih dari 500 peserta dari berbagai industri.',
        fee: 500000
      },
      {
        user_id: createdMentors[1].user_id,
        position: 'Komunikasi Persuasif & Negosiasi',
        bio: 'Profesor komunikasi dengan spesialisasi dalam teknik persuasi dan negosiasi. Berpengalaman melatih tim sales dan marketing dari perusahaan multinasional.',
        fee: 750000
      },
      {
        user_id: createdMentors[2].user_id,
        position: 'Storytelling Expert',
        bio: 'Praktisi komunikasi yang fokus pada storytelling untuk presentasi dan pitching. Membantu startup dan entrepreneur menyampaikan ide dengan powerful.',
        fee: 400000
      },
      {
        user_id: createdMentors[3].user_id,
        position: 'Body Language Specialist',
        bio: 'Spesialis bahasa tubuh dan komunikasi non-verbal. Membantu meningkatkan kepercayaan diri dan presence saat berbicara di depan umum.',
        fee: 450000
      },
      {
        user_id: createdMentors[4].user_id,
        position: 'Psikolog Komunikasi',
        bio: 'Psikolog dengan spesialisasi mengatasi kecemasan berbicara di depan umum. Menggunakan pendekatan kognitif-behavioral untuk membangun confidence.',
        fee: 550000
      }
    ];

    for (const profileData of mentorProfiles) {
      const [profile, created] = await MentorProfile.findOrCreate({
        where: { user_id: profileData.user_id },
        defaults: profileData
      });
      if (created) {
        console.log(`✓ Created mentor profile for user_id: ${profileData.user_id}`);
      }
    }

    console.log('✅ Mentoring data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding mentoring data:', error);
    throw error;
  }
};

module.exports = seedMentoringData;
