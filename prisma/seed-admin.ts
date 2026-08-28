// Production seed: a clean world with only the Deity (admin) and the guild rank ladder.
// Run once after deploying to Vercel:
//   DATABASE_URL="postgresql://..." bun run prisma/seed-admin.ts
//
// All lore (countries, gods, legends, grimoire chapters, lab entries, quests,
// achievements, demo players) is intentionally left EMPTY — the DM fills it
// through the admin panel ("Чертог Божества") at runtime.

import { PrismaClient } from '@prisma/client'
import { scryptSync, randomBytes } from 'crypto'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding production database (clean start)...')

  // --- Deity (admin) ---
  const adminEmail = process.env.ADMIN_EMAIL || 'deity@eldrin.world'
  const adminPass = process.env.ADMIN_PASSWORD || 'divine123'
  const adminName = process.env.ADMIN_NAME || 'Аэтериус'

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      password: hashPassword(adminPass),
      role: 'ADMIN',
    },
  })
  console.log(`✓ Deity created — email: ${adminEmail}`)
  console.log('  (change the password in the admin panel after first login!)')

  // --- Guild rank ladder (required for the rank/XP system to function) ---
  const ranks = [
    { name: 'Железный Искатель', level: 1, description: 'Новички гильдии, только вступившие на путь авантюр.', icon: '⚔️', minXp: 0 },
    { name: 'Бронзовый Следопыт', level: 2, description: 'Проверенные в первом испытании.', icon: '🛡️', minXp: 200 },
    { name: 'Серебряный Клинок', level: 3, description: 'Опытные искатели приключений.', icon: '🗡️', minXp: 600 },
    { name: 'Золотой Защитник', level: 4, description: 'Ветераны множества походов.', icon: '🏆', minXp: 1500 },
    { name: 'Мифический Чемпион', level: 5, description: 'Легенды гильдии, чьи имена знает весь мир.', icon: '👑', minXp: 5000 },
  ]
  for (const r of ranks) {
    await db.guildRank.upsert({
      where: { level: r.level },
      update: {},
      create: r,
    })
  }
  console.log(`✓ ${ranks.length} guild ranks created`)

  console.log('\n✨ Clean production seed complete.')
  console.log('   The world is empty — log in as the Deity and start building it.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
