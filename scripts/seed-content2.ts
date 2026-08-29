import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const items = [
    { key: 'knowledge_intro', title: 'База Знаний', body: 'Древняя библиотека мира за гранью тьмы. Каждая страница — осколок истины, сохранённый летописцами.' },
    { key: 'grimoire_intro', title: 'Тайный Гримуар', body: 'Древний кодекс, написанный на языке, которого больше не существует. Главы его запечатаны магией — сокрыты не только слова, но и сами названия.' },
    { key: 'lab_intro', title: 'Лаборатория Алого', body: 'Здесь Божество записывает свои авторские механики — кастомные расы, классы и подклассы, оригинальные заклинания и магические предметы, что существуют лишь в этом мире.' },
    { key: 'guild_intro', title: 'Гильдия Авантюристов', body: '«С мечом и магией — через тьму к славе.» Обитель всех, кто избрал путь искателя приключений.' },
    { key: 'guild_ranks_intro', title: 'Ранги', body: 'Каждый герой начинает с низов и поднимается по рангам, набирая опыт в заданиях.' },
  ]
  for (const it of items) {
    await db.siteContent.upsert({ where: { key: it.key }, update: {}, create: it })
    console.log('seeded:', it.key)
  }
  const all = await db.siteContent.findMany()
  console.log('total content entries:', all.length)
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect())
