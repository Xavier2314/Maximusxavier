import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@freelancefund.app' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@freelancefund.app',
      password: adminPassword,
      role: 'ADMIN',
      subscriptionEnd: new Date('2099-12-31'),
    },
  });
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // Create a sponsor
  const sponsorPassword = await bcrypt.hash('Sponsor@123', 12);
  const sponsor = await prisma.user.upsert({
    where: { email: 'sponsor@example.com' },
    update: {},
    create: {
      name: 'John Sponsor',
      email: 'sponsor@example.com',
      password: sponsorPassword,
      role: 'SPONSOR',
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.wallet.upsert({
    where: { userId: sponsor.id },
    update: {},
    create: { userId: sponsor.id },
  });

  // Create a downline
  const downlinePassword = await bcrypt.hash('Downline@123', 12);
  const downline = await prisma.user.upsert({
    where: { email: 'freelancer@example.com' },
    update: {},
    create: {
      name: 'Jane Freelancer',
      email: 'freelancer@example.com',
      password: downlinePassword,
      role: 'DOWNLINE',
      sponsorId: sponsor.id,
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  const downlineWallet = await prisma.wallet.upsert({
    where: { userId: downline.id },
    update: {},
    create: { userId: downline.id, totalEarned: 150000 },
  });

  // Add some sample transactions
  await prisma.transaction.createMany({
    data: [
      { walletId: downlineWallet.id, type: 'CREDIT', amount: 50000, description: 'Freelance project payment', status: 'COMPLETED' },
      { walletId: downlineWallet.id, type: 'CREDIT', amount: 75000, description: 'Web development contract', status: 'COMPLETED' },
      { walletId: downlineWallet.id, type: 'CREDIT', amount: 25000, description: 'Design work', status: 'COMPLETED' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed complete!');
  console.log('\n📋 Test accounts:');
  console.log('  Admin:    admin@freelancefund.app / Admin@123456');
  console.log('  Sponsor:  sponsor@example.com / Sponsor@123');
  console.log('  Downline: freelancer@example.com / Downline@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
