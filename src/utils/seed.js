const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/database');
require('dotenv').config();

/**
 * Seed sample data to database
 */
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Hash password for sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create sample users
    console.log('👥 Creating sample users...');
    
    const sampleUsers = [
      {
        email: 'customer@cleanaceh.com',
        phone: '+6281234567890',
        password_hash: hashedPassword,
        full_name: 'Mustapa Jamija',
        user_type: 'customer',
        status: 'active',
        email_verified: true,
        phone_verified: true
      },
      {
        email: 'cleaner1@cleanaceh.com',
        phone: '+6281234567891',
        password_hash: hashedPassword,
        full_name: 'Ganang Setyo Hadi',
        user_type: 'cleaner',
        status: 'active',
        email_verified: true,
        phone_verified: true
      },
      {
        email: 'cleaner2@cleanaceh.com',
        phone: '+6281234567892',
        password_hash: hashedPassword,
        full_name: 'Rafli Afriza Nugraha',
        user_type: 'cleaner',
        status: 'active',
        email_verified: true,
        phone_verified: true
      },
      {
        email: 'cleaner3@cleanaceh.com',
        phone: '+6281234567893',
        password_hash: hashedPassword,
        full_name: 'Fadlul Ihsan',
        user_type: 'cleaner',
        status: 'active',
        email_verified: true,
        phone_verified: true
      },
      {
        email: 'admin@cleanaceh.com',
        phone: '+6281234567894',
        password_hash: hashedPassword,
        full_name: 'Admin CleanAceh',
        user_type: 'admin',
        status: 'active',
        email_verified: true,
        phone_verified: true
      }
    ];

    // Insert users one by one to handle conflicts
    let users = [];
    for (const user of sampleUsers) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .upsert(user, { onConflict: 'email' })
          .select()
          .single();
        
        if (error) {
          // If user already exists, get it
          if (error.code === '23505') {
            const { data: existingUser } = await supabaseAdmin
              .from('users')
              .select()
              .eq('email', user.email)
              .single();
            if (existingUser) users.push(existingUser);
          } else {
            console.error(`Error creating user ${user.email}:`, error);
          }
        } else {
          users.push(data);
        }
      } catch (err) {
        console.error(`Error with user ${user.email}:`, err);
      }
    }

    console.log(`✅ Created/found ${users.length} sample users`);

    // Get user IDs for relationships
    const customerUser = users.find(u => u.user_type === 'customer');
    const cleanerUsers = users.filter(u => u.user_type === 'cleaner');

    // 2. Create sample addresses for customer
    if (customerUser) {
      console.log('🏠 Creating sample addresses...');
      
      const sampleAddresses = [
        {
          user_id: customerUser.id,
          label: 'Rumah',
          full_address: 'Jl. Teuku Umar No. 24, Banda Aceh',
          city: 'Banda Aceh',
          postal_code: '23111',
          latitude: 5.5502,
          longitude: 95.3237,
          is_main: true
        },
        {
          user_id: customerUser.id,
          label: 'Kantor',
          full_address: 'Jl. Iskandar Muda No. 15, Banda Aceh',
          city: 'Banda Aceh',
          postal_code: '23111',
          latitude: 5.5480,
          longitude: 95.3215,
          is_main: false
        }
      ];

      for (const address of sampleAddresses) {
        try {
          const { error } = await supabaseAdmin
            .from('user_addresses')
            .insert(address);
          
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating address:', error);
          }
        } catch (err) {
          console.error('Error with address:', err);
        }
      }
      
      console.log('✅ Created sample addresses');
    }

    // 3. Create sample payment methods for customer
    if (customerUser) {
      console.log('💳 Creating sample payment methods...');
      
      const samplePaymentMethods = [
        {
          user_id: customerUser.id,
          type: 'ewallet',
          provider: 'DANA',
          account_number: '081234567890',
          account_name: 'Mustapa Jamija',
          is_active: true
        },
        {
          user_id: customerUser.id,
          type: 'bank_transfer',
          provider: 'BCA',
          account_number: '1234567890',
          account_name: 'Mustapa Jamija',
          is_active: true
        }
      ];

      for (const paymentMethod of samplePaymentMethods) {
        try {
          const { error } = await supabaseAdmin
            .from('payment_methods')
            .insert(paymentMethod);
          
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating payment method:', error);
          }
        } catch (err) {
          console.error('Error with payment method:', err);
        }
      }
      
      console.log('✅ Created sample payment methods');
    }

    // 4. Create cleaner profiles
    if (cleanerUsers.length > 0) {
      console.log('🧹 Creating cleaner profiles...');
      
      const cleanerProfiles = [
        {
          user_id: cleanerUsers[0]?.id, // Ganang Setyo Hadi
          bio: 'Saya adalah seorang pembersih profesional dengan pengalaman lebih dari 5 tahun. Saya mengutamakan kepuasan pelanggan dan hasil yang bersih, rapi, serta higienis.',
          experience_years: 5,
          hourly_rate: 50000,
          rating: 4.9,
          total_jobs: 124,
          total_reviews: 98,
          is_available: true,
          service_areas: ['Banda Aceh', 'Sabang', 'Aceh Besar'],
          skills: ['Pembersihan Umum', 'Pembersihan Dapur', 'Pembersihan Kamar Mandi'],
          equipment_provided: true,
          profile_verified: true
        },
        {
          user_id: cleanerUsers[1]?.id, // Rafli Afriza Nugraha
          bio: 'Berpengalaman dalam pembersihan rumah dengan detail yang tinggi. Selalu tepat waktu dan menggunakan bahan pembersih yang aman.',
          experience_years: 3,
          hourly_rate: 45000,
          rating: 4.7,
          total_jobs: 44,
          total_reviews: 35,
          is_available: true,
          service_areas: ['Banda Aceh', 'Sigli'],
          skills: ['Pembersihan Umum', 'Pembersihan Furnitur'],
          equipment_provided: true,
          profile_verified: true
        },
        {
          user_id: cleanerUsers[2]?.id, // Fadlul Ihsan
          bio: 'Ahli dalam pembersihan mendalam dengan pengalaman bertahun-tahun. Menjamin kepuasan pelanggan 100%.',
          experience_years: 8,
          hourly_rate: 35000,
          rating: 4.8,
          total_jobs: 1087,
          total_reviews: 892,
          is_available: true,
          service_areas: ['Banda Aceh', 'Sabang', 'Aceh Besar', 'Bireun'],
          skills: ['Pembersihan Umum', 'Pembersihan Kamar Mandi', 'Pembersihan Karpet'],
          equipment_provided: true,
          profile_verified: true
        }
      ].filter(profile => profile.user_id); // Remove profiles without user_id

      for (const profile of cleanerProfiles) {
        try {
          const { error } = await supabaseAdmin
            .from('cleaner_profiles')
            .insert(profile);
          
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating cleaner profile:', error);
          }
        } catch (err) {
          console.error('Error with cleaner profile:', err);
        }
      }
      
      console.log('✅ Created cleaner profiles');
    }

    // 5. Create sample schedules for cleaners
    if (cleanerUsers.length > 0) {
      console.log('📅 Creating cleaner schedules...');
      
      // Get cleaner profiles
      const { data: cleanerProfiles } = await supabaseAdmin
        .from('cleaner_profiles')
        .select('id, user_id')
        .in('user_id', cleanerUsers.map(u => u.id));

      for (const profile of cleanerProfiles || []) {
        // Create schedule for Monday to Saturday (1-6)
        for (let day = 1; day <= 6; day++) {
          try {
            const { error } = await supabaseAdmin
              .from('cleaner_schedules')
              .insert({
                cleaner_id: profile.id,
                day_of_week: day,
                start_time: '08:00',
                end_time: day === 6 ? '16:00' : '18:00', // Saturday until 4 PM
                is_available: true
              });

            if (error && error.code !== '23505') { // Ignore duplicate key errors
              console.error('Error creating schedule:', error);
            }
          } catch (err) {
            console.error('Error with schedule:', err);
          }
        }
      }
      
      console.log('✅ Created cleaner schedules');
    }

    // 6. Create sample notifications
    if (customerUser) {
      console.log('🔔 Creating sample notifications...');
      
      const sampleNotifications = [
        {
          user_id: customerUser.id,
          title: 'Selamat datang di CleanAceh!',
          message: 'Terima kasih telah bergabung dengan CleanAceh. Nikmati layanan pembersihan profesional kami.',
          type: 'system',
          is_read: false
        },
        {
          user_id: customerUser.id,
          title: 'Promo Spesial!',
          message: 'Dapatkan diskon 30% untuk pembersihan umum. Gunakan kode CLEAN30.',
          type: 'promotion',
          is_read: false
        }
      ];

      for (const notification of sampleNotifications) {
        try {
          const { error } = await supabaseAdmin
            .from('notifications')
            .insert(notification);
          
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating notification:', error);
          }
        } catch (err) {
          console.error('Error with notification:', err);
        }
      }
      
      console.log('✅ Created sample notifications');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('Customer: customer@cleanaceh.com / password123');
    console.log('Cleaner 1: cleaner1@cleanaceh.com / password123');
    console.log('Cleaner 2: cleaner2@cleanaceh.com / password123');
    console.log('Cleaner 3: cleaner3@cleanaceh.com / password123');
    console.log('Admin: admin@cleanaceh.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };