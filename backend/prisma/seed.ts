import { PrismaClient, Role, Difficulty, CompetitionStatus } from '@prisma/client';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const UPLOADS_DIR = path.resolve('uploads', 'challenges');
const TARGETS_DIR = path.resolve('targets');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function writePlaceholderImage(filePath: string, color: string) {
  const buf = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: color,
    },
  }).png().toBuffer();
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, buf);
}

async function main() {
  console.log('🌱 Seeding database...');

  // -------------------------------------------------------------------------
  // 1. Clear existing data (order matters due to foreign keys)
  // -------------------------------------------------------------------------
  await prisma.submission.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.competitionState.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleared existing data');

  // -------------------------------------------------------------------------
  // 2. Create users (participants + 1 admin)
  // -------------------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Sarwagya',
      role: Role.ADMIN,
      pinCode: '0000',
    },
  });

  const participants = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Aarav Sharma',
        rollNumber: 'NCE-2024-001',
        pinCode: '1234',
        role: Role.PARTICIPANT,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Priya Patel',
        rollNumber: 'NCE-2024-002',
        pinCode: '5678',
        role: Role.PARTICIPANT,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Rohan Adhikari',
        rollNumber: 'NCE-2024-003',
        // No PIN — exercises the "no PIN" path
        role: Role.PARTICIPANT,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sita Basnet',
        rollNumber: 'NCE-2024-004',
        pinCode: '9012',
        role: Role.PARTICIPANT,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kiran Thapa',
        // No rollNumber, no PIN
        role: Role.PARTICIPANT,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Anisha Gurung',
        rollNumber: 'NCE-2024-006',
        pinCode: '3456',
        role: Role.PARTICIPANT,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dipesh Maharjan',
        rollNumber: 'NCE-2024-007',
        // No PIN
        role: Role.PARTICIPANT,
      },
    }),
  ]);

  console.log(`  ✓ Created 1 admin + ${participants.length} participants`);

  // -------------------------------------------------------------------------
  // 3. Create challenges
  // -------------------------------------------------------------------------
  const challenges = await Promise.all([
    prisma.challenge.create({
      data: {
        title: 'Simple Square',
        description:
          'Create a 200×200px blue square centered on the page with a white background.',
        difficulty: Difficulty.EASY,
        targetImageUrl: '/targets/challenge-1.png',
        roundNumber: 1,
        published: true,
        createdBy: admin.id,
      },
    }),
    prisma.challenge.create({
      data: {
        title: 'Traffic Light',
        description:
          'Build a vertical traffic light with three circles (red, yellow, green) inside a dark rectangle.',
        difficulty: Difficulty.EASY,
        targetImageUrl: '/targets/challenge-2.png',
        roundNumber: 1,
        published: true,
        createdBy: admin.id,
      },
    }),
    prisma.challenge.create({
      data: {
        title: 'Concentric Circles',
        description:
          'Draw three concentric circles with alternating colors (blue, white, blue) centered on the page.',
        difficulty: Difficulty.MEDIUM,
        targetImageUrl: '/targets/challenge-3.png',
        roundNumber: 2,
        published: false,
        createdBy: admin.id,
      },
    }),
    prisma.challenge.create({
      data: {
        title: 'CSS Flag',
        description:
          'Recreate a simplified flag using only HTML and CSS. No images allowed.',
        difficulty: Difficulty.MEDIUM,
        targetImageUrl: '/targets/challenge-4.png',
        roundNumber: 2,
        published: false,
        createdBy: admin.id,
      },
    }),
    prisma.challenge.create({
      data: {
        title: 'Mondrian Art',
        description:
          'Recreate a Mondrian-style composition with colored rectangles and black borders.',
        difficulty: Difficulty.HARD,
        targetImageUrl: '/targets/challenge-5.png',
        roundNumber: 3,
        published: false,
        createdBy: admin.id,
      },
    }),
  ]);

  ensureDir(TARGETS_DIR);
  await Promise.all([
    writePlaceholderImage(path.join(TARGETS_DIR, 'challenge-1.png'), '#ffffff'),
    writePlaceholderImage(path.join(TARGETS_DIR, 'challenge-2.png'), '#222222'),
    writePlaceholderImage(path.join(TARGETS_DIR, 'challenge-3.png'), '#0000ff'),
    writePlaceholderImage(path.join(TARGETS_DIR, 'challenge-4.png'), '#ff0000'),
    writePlaceholderImage(path.join(TARGETS_DIR, 'challenge-5.png'), '#ffffff'),
  ]);

  console.log(`  ✓ Created ${challenges.length} challenges`);

  // -------------------------------------------------------------------------
  // 4. Create submissions (varied scores for leaderboard testing)
  // -------------------------------------------------------------------------
  const submissionData = [
    // Challenge 1 — Simple Square
    {
      userId: participants[0].id, // Aarav
      challengeId: challenges[0].id,
      htmlCode: '<div class="square"></div>',
      cssCode:
        'body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff}.square{width:200px;height:200px;background:blue}',
      codeLength: 156,
      score: 98.75,
      isBest: true,
    },
    {
      userId: participants[1].id, // Priya
      challengeId: challenges[0].id,
      htmlCode: '<div></div>',
      cssCode:
        'body{margin:0;display:grid;place-items:center;height:100vh;background:#fff}div{width:200px;height:200px;background:blue}',
      codeLength: 121,
      score: 99.12,
      isBest: true,
    },
    {
      userId: participants[2].id, // Rohan
      challengeId: challenges[0].id,
      htmlCode: '<div></div>',
      cssCode:
        'body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}div{width:200px;height:200px;background:#00f}',
      codeLength: 138,
      score: 95.30,
      isBest: true,
    },
    // Challenge 2 — Traffic Light
    {
      userId: participants[0].id, // Aarav
      challengeId: challenges[1].id,
      htmlCode:
        '<div class="light"><div class="red"></div><div class="yellow"></div><div class="green"></div></div>',
      cssCode:
        '.light{width:80px;margin:auto;background:#333;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:10px}.red,.yellow,.green{width:60px;height:60px;border-radius:50%;margin:0 auto}.red{background:red}.yellow{background:yellow}.green{background:green}',
      codeLength: 312,
      score: 87.44,
      isBest: true,
    },
    {
      userId: participants[3].id, // Sita
      challengeId: challenges[1].id,
      htmlCode:
        '<div class="tl"><span></span><span></span><span></span></div>',
      cssCode:
        '.tl{width:80px;margin:20px auto;background:#222;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}span{width:56px;height:56px;border-radius:50%;margin:0 auto}.tl span:nth-child(1){background:red}.tl span:nth-child(2){background:#ff0}.tl span:nth-child(3){background:green}',
      codeLength: 298,
      score: 91.20,
      isBest: true,
    },
    {
      userId: participants[5].id, // Anisha
      challengeId: challenges[0].id,
      htmlCode: '<div></div>',
      cssCode:
        'body{background:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}div{width:200px;height:200px;background:#0000ff}',
      codeLength: 149,
      score: 97.88,
      isBest: true,
    },
    // A second (non-best) submission from Aarav on Challenge 1
    {
      userId: participants[0].id, // Aarav (earlier, worse attempt)
      challengeId: challenges[0].id,
      htmlCode: '<div></div>',
      cssCode: 'div{width:200px;height:200px;background:blue;margin:auto}',
      codeLength: 57,
      score: 72.50,
      isBest: false,
    },
  ];

  for (const sub of submissionData) {
    await prisma.submission.create({
      data: {
        userId: sub.userId,
        challengeId: sub.challengeId,
        htmlCode: sub.htmlCode,
        cssCode: sub.cssCode,
        codeLength: sub.codeLength,
        score: sub.score,
        isBest: sub.isBest,
      },
    });
  }

  console.log(`  ✓ Created ${submissionData.length} submissions`);

  // -------------------------------------------------------------------------
  // 5. Create initial CompetitionState
  // -------------------------------------------------------------------------
  await prisma.competitionState.create({
    data: {
      status: CompetitionStatus.NOT_STARTED,
      currentRound: 1,
      locked: false,
      leaderboardFrozen: false,
    },
  });

  console.log('  ✓ Created CompetitionState (NOT_STARTED)');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
