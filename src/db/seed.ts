import { db } from './client';
import { users, companySettings } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('EcoAdmin2026!', 10);
  await db.insert(users).values({
    email: 'admin@ecospread.co.il',
    passwordHash,
    name: 'Admin EcoSpread',
    role: 'admin',
  }).onConflictDoNothing();

  // Create default company settings
  await db.insert(companySettings).values({
    id: 1,
    name: 'EcoSpread Watches',
    phone: '+972-50-1234567',
    email: 'info@ecospread-watches.co.il',
    about: 'מומחים לשעוני יוקרה ומותגים מובילים.',
    targetPriceOffset: '-5',
    brands: [
      { brandName: 'Tissot', warranty: 'שנתיים אחריות יבואן רשמי', minPrice: '₪1,500' },
      { brandName: 'Casio', warranty: 'שנה אחריות יבואן רשמי', minPrice: '₪200' },
    ],
  }).onConflictDoNothing();

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
