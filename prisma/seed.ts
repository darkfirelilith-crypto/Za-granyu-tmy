import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/password'

async function main() {
  console.log('🌱 Seeding the world of Eldrin...')

  // === Admin (Божество) ===
  await db.user.upsert({
    where: { email: 'deity@eldrin.world' },
    update: {},
    create: {
      email: 'deity@eldrin.world',
      name: 'Аэтериус',
      password: hashPassword('divine123'),
      role: 'ADMIN',
    },
  })
  console.log('✓ Deity (admin) created — email: deity@eldrin.world / pass: divine123')

  // === Player + Character ===
  const player = await db.user.upsert({
    where: { email: 'hero@eldrin.world' },
    update: {},
    create: {
      email: 'hero@eldrin.world',
      name: 'Сэр Игрок',
      password: hashPassword('hero123'),
      role: 'PLAYER',
    },
  })

  const iron = await db.guildRank.upsert({
    where: { level: 1 },
    update: {},
    create: {
      name: 'Железный Искатель',
      level: 1,
      description: 'Новички гильдии, только вступившие на путь авантюр.',
      icon: '⚔️',
      minXp: 0,
    },
  })
  await db.guildRank.upsert({
    where: { level: 2 },
    update: {},
    create: { name: 'Бронзовый Следопыт', level: 2, description: 'Проверенные в первом испытании.', icon: '🛡️', minXp: 200 },
  })
  await db.guildRank.upsert({
    where: { level: 3 },
    update: {},
    create: { name: 'Серебряный Клинок', level: 3, description: 'Опытные искатели приключений.', icon: '🗡️', minXp: 600 },
  })
  await db.guildRank.upsert({
    where: { level: 4 },
    update: {},
    create: { name: 'Золотой Защитник', level: 4, description: 'Ветераны множества походов.', icon: '🏆', minXp: 1500 },
  })
  await db.guildRank.upsert({
    where: { level: 5 },
    update: {},
    create: { name: 'Мифический Чемпион', level: 5, description: 'Легенды гильдии, чьи имена знает весь мир.', icon: '👑', minXp: 5000 },
  })
  console.log('✓ Guild ranks created')

  await db.character.upsert({
    where: { userId: player.id },
    update: {},
    create: {
      userId: player.id,
      name: 'Тэодрик Зорестрелец',
      race: 'Человек',
      charClass: 'Паладин',
      level: 3,
      xp: 640,
      bio: 'Тэодрик — паладин ордена Серебряного Пламени, поклявшийся защищать слабых от тьмы. Родом из деревни Кроссхоллоу, он видел, как нежить поглотила его дом, и с тех пор посвятил жизнь борьбе со злом.',
      portrait: '',
      guildRankId: iron.id,
    },
  })
  console.log('✓ Character created')

  // === Achievements ===
  const achs = [
    { name: 'Первый Кровавый', description: 'Одолей первого врага в бою.', icon: '🩸', rarity: 'COMMON', category: 'Боевые' },
    { name: 'Покоритель Подземелий', description: 'Заверши первое подземелье.', icon: '🏰', rarity: 'RARE', category: 'Исследования' },
    { name: 'Знаток Лора', description: 'Прочти все записи в Базе Знаний.', icon: '📜', rarity: 'EPIC', category: 'Исследования' },
    { name: 'Дипломат', description: 'Установи мир между двумя враждующими странами.', icon: '🕊️', rarity: 'EPIC', category: 'Социальные' },
    { name: 'Укротитель Дракона', description: 'Победи древнего дракона.', icon: '🐉', rarity: 'LEGENDARY', category: 'Боевые' },
    { name: 'Расшифровщик Гримуара', description: 'Открой первую страницу Гримуара.', icon: '🔮', rarity: 'RARE', category: 'Тайны' },
    { name: 'Избранник Богов', description: 'Получи благословение от трёх разных богов.', icon: '✨', rarity: 'MYTHIC', category: 'Тайны' },
    { name: 'Мастер Гильдии', description: 'Достигни ранга Золотой Защитник.', icon: '🏆', rarity: 'LEGENDARY', category: 'Гильдия' },
  ]
  for (const a of achs) {
    await db.achievement.upsert({
      where: { name: a.name },
      update: {},
      create: a,
    })
  }
  console.log('✓ Achievements created')

  // === Countries ===
  const countries = [
    { name: 'Эльдрион', description: 'Старейшее королевство людей, сердце цивилизации. Известно своими белокаменными башнями и древней магической академией.', emblem: '🦅', capital: 'Аэтерхолд', government: 'Наследственная монархия', population: '~2 млн', culture: 'Общество ценит знания, рыцарство и честь. Год делится на шесть праздников, посвящённых богам.', climate: 'Умеренный, с зелёными долинами и снежными горами на севере.' },
    { name: 'Сильваниэль', description: 'Лесное царство эльфов, скрытое в Древних Чащах. Сюда не вступают чужаки без дозволения Лесного Совета.', emblem: '🌿', capital: 'Аэнорэль', government: 'Совет Старейшин', population: '~400 тыс.', culture: 'Эльфы чтут гармонию с природой и древние песни. Магия вплетена в каждое дерево и ручей.', climate: 'Вечнозелёный, туманный и влажный.' },
    { name: 'Каз-Думар', description: 'Подгорная твердыня гномов, славящаяся сталью, паром и несметными рудами. Своими залами гномы гордятся больше всех сокровищ.', emblem: '⛏️', capital: 'Каз-Думар', government: 'Клановый совет', population: '~800 тыс.', culture: 'Дело важнее слов. Каждая семья хранит книгу предков, выгравированную на камне.', climate: 'Подземный, вулканическое тепло.' },
    { name: 'Тёмные Пустоши', description: 'Проклятые земли за Хребтом Дракона, где некогда царил Лич-Владыка. Мёртвая земля, где не растёт трава.', emblem: '💀', capital: 'Нет', government: 'Хаос', population: 'Неизвестно', culture: 'Здесь обитают нежить, изгнанники и культисты. Законы цивилизации забыты.', climate: 'Холодный, ядовитые туманы, вечные сумерки.' },
    { name: 'Вольные Острова', description: 'Архипелаг торговцев, корсаров и вольных городов. Здесь не правит ни один король — только золото и слово.', emblem: '⚓', capital: 'Порт-Моррай', government: 'Конфедерация городов', population: '~1.2 млн', culture: 'Смешение народов, рынки мира, язык сделок. Каждый город — закон сам себе.', climate: 'Тропический, морские ветра.' },
  ]
  for (const c of countries) {
    await db.country.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    })
  }
  console.log('✓ Countries created')

  // === Personalities ===
  const persons = [
    { name: 'Король Альдрик III', title: 'Король Эльдриона', description: 'Суровый, но справедливый правитель Эльдриона. Прошёл три войны и видел смерть наследника. Его корону — последняя опора мира людей.', affiliation: 'Эльдрион', role: 'Монарх', status: 'alive' },
    { name: 'Архимаг Велестрина', title: 'Хранительница Академии', description: 'Верховная чародейка Белой Башни. Ей триста лет, но выглядит на тридцать. Знает тайны, которые забыли сами боги.', affiliation: 'Эльдрион', role: 'Архимаг', status: 'alive' },
    { name: 'Торн Глубокий Камень', title: 'Король-под-Горой', description: 'Гномий владыка Каз-Думара, чьё сердце бьётся в такт великим горнам. Поговаривают, он выковал меч, способный ранить бога.', affiliation: 'Каз-Думар', role: 'Монарх', status: 'alive' },
    { name: 'Леди Иссандра', title: 'Тайная Длань', description: 'Глава гильдии убийц из Тёмных Пустошей. Никто не видел её лица и не выжил, чтобы рассказать.', affiliation: 'Тёмные Пустоши', role: 'Мастер гильдии', status: 'missing' },
    { name: 'Моргант Безликий', title: 'Лич-Владыка (сражён)', description: 'Тёмный колдун, едва не поглотивший мир триста лет назад. Был повержен Серебряным Союзом, но тело его так и не найдено...', affiliation: 'Тёмные Пустоши', role: 'Лич', status: 'deceased' },
    { name: 'Капитан Рорик Стальморе', title: 'Адмирал Вольного Флота', description: 'Легендарный корсар, ставший адмиралом. Его флагман «Серебряный Кракен» знают в каждом порту мира.', affiliation: 'Вольные Острова', role: 'Адмирал', status: 'alive' },
  ]
  for (const p of persons) {
    await db.personality.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    })
  }
  console.log('✓ Personalities created')

  // === Country Relations ===
  const rels = [
    { countryAName: 'Эльдрион', countryBName: 'Сильваниэль', relationType: 'ally', description: 'Старый союз, скреплённый Договором Серебряных Веков.' },
    { countryAName: 'Эльдрион', countryBName: 'Каз-Думар', relationType: 'trade', description: 'Активная торговля сталью и зерном.' },
    { countryAName: 'Эльдрион', countryBName: 'Тёмные Пустоши', relationType: 'enemy', description: 'Вечная война с нежитью. Граница охраняется Орденом Серебряного Пламени.' },
    { countryAName: 'Эльдрион', countryBName: 'Вольные Острова', relationType: 'neutral', description: 'Напряжённый мир, occasional стычки из-за пошлин.' },
    { countryAName: 'Сильваниэль', countryBName: 'Каз-Думар', relationType: 'neutral', description: 'Равнодушие. Эльфы и гномы — давние соперники в магии и ремесле.' },
    { countryAName: 'Каз-Думар', countryBName: 'Тёмные Пустоши', relationType: 'enemy', description: 'Нежить вторгалась в нижние залы — гномы потеряли три клана.' },
    { countryAName: 'Вольные Острова', countryBName: 'Тёмные Пустоши', relationType: 'trade', description: 'Контрабанда некромантских фетишей — тайна, известная всем.' },
  ]
  for (const r of rels) {
    await db.countryRelation.create({ data: r }).catch(() => {})
  }
  console.log('✓ Country relations created')

  // === World Systems ===
  const systems = [
    { title: 'Великий Совет Шести', category: 'POLITICS', description: 'Раз в три года правители шести свободных народов собираются в Аэтерхолде. Решения Совета касаются войны, мира и магии.', icon: '⚖️' },
    { title: 'Серебряная Монета', category: 'ECONOMY', description: 'Общая валюта свободных земель. Эльфийские луны, гномьи слитки и островные дукаты обмениваются по курсу Совета.', icon: '🪙' },
    { title: 'Орден Серебряного Пламени', category: 'MILITARY', description: 'Рыцарский орден, стоящий на страже границы с Тёмными Пустошами. Девиз: «Свет не гаснет».', icon: '🔥' },
    { title: 'Семь Школ Магии', category: 'MAGIC', description: 'Академия Белой Башни обучает семи школам: Огонь, Вода, Земля, Воздух, Разум, Жизнь и Тень. Восьмая школа — Запретная.', icon: '🔮' },
    { title: 'Кодекс Шести Богов', category: 'LAW', description: 'Священные законы, дарованные богами. На них клянутся короли, и ими судят отступников.', icon: '📜' },
    { title: 'Гильдия Авантюристов', category: 'ECONOMY', description: 'Единая организация, регулирующая наём искателей приключений. Без знака гильдии любой наём — вне закона.', icon: '🗺️' },
  ]
  for (const s of systems) {
    await db.worldSystem.upsert({
      where: { title: s.title },
      update: {},
      create: s,
    })
  }
  console.log('✓ World systems created')

  // === Gods (Pantheon) ===
  const gods = [
    { name: 'Аэтар', title: 'Отец Небес', domain: 'Свет и справедливость', description: 'Верховный бог пантеона, владыка солнца и клятв. Его алтари стоят в каждом крупном городе.', symbol: '☀️', alignment: 'good', pantheon: 'Шестерых' },
    { name: 'Морриган', title: 'Дева Битв', domain: 'Война и честь', description: 'Богиня войны, забирающая павших воинов в свою небесную дружину. Клятва на мече — её дар.', symbol: '⚔️', alignment: 'neutral', pantheon: 'Шестерых' },
    { name: 'Сильванион', title: 'Лесной Дед', domain: 'Природа и дикие земли', description: 'Бог лесов и зверей. Эльфы считают его своим прародителем. Является в облике огромного оленя.', symbol: '🦌', alignment: 'neutral', pantheon: 'Шестерых' },
    { name: 'Горм', title: 'Кузнец Душ', domain: 'Ремёсла и подземелье', description: 'Бог-творец гномов, кующий судьбы в своей подземной кузнице. Каждый гном родится с его искрой.', symbol: '🔨', alignment: 'good', pantheon: 'Шестерых' },
    { name: 'Мортис', title: 'Владыка Сумерек', domain: 'Смерть и загробный мир', description: 'Страж врат между мирами. Не злой, но безжалостный. Провожает души к их последнему суду.', symbol: '🕯️', alignment: 'neutral', pantheon: 'Шестерых' },
    { name: 'Ноктюрис', title: 'Тёмный Шёпот', domain: 'Тайны, ложь, запретное знание', description: 'Изгнанный бог, отец нежити и культа Безликих. Его имя запрещено произносить вслух.', symbol: '🌑', alignment: 'evil', pantheon: 'Изгнанный' },
  ]
  for (const g of gods) {
    await db.god.upsert({
      where: { name: g.name },
      update: {},
      create: g,
    })
  }
  console.log('✓ Gods created')

  // === Legends ===
  const legends = [
    { title: 'Сумеречная Война', content: 'Триста лет назад Лич-Владыка Моргант поднял армию мёртвых и едва не поглотил мир. Шесть народов объединились в Серебряный Союз и отбили тьму ценой половины своих воинов. Моргант был повержен, но тело его не нашли. С тех пор каждый ребёнок знает: «Тьма спит — но не мертва».', era: 'Эра Сумерек', icon: '⚔️' },
    { title: 'Падение Звезды', content: 'Говорят, что в ночь падения Серебряной Звезды родилась Велестрина. Звезда упала за Хребтом Дракона, и там, где она коснулась земли, расцвёл серебряный лес, которого не было раньше. С тех пор эльфы называют это место Священной Рощей.', era: 'Ранние Годы', icon: '🌟' },
    { title: 'Проклятие Трона', content: 'Легенда гласит: король Эльдриона, не оставивший наследника, проклянёт землю голодом на семь лет. Поэтому Альдрик III, потеряв сына, держит это в тайне и ищет достойного приёмного наследника среди рыцарей ордена.', era: 'Эра Королей', icon: '👑' },
    { title: 'Песня о Семи Мостах', content: 'В Вольных Островах есть поговорка: тот, кто пройдёт все семь мостов Порт-Моррая за один день и не заплатит ни одного серебряника, получит одно желание от Капитана. Никто ещё не succeeded — но многие пытались.', era: 'Эра Торговли', icon: '🌉' },
    { title: 'Гримуар Первородного', content: 'Страницы древней книги, написанной на языке, которого больше не существует. Говорят, что в ней записана история мира до богов — и тайна, как их свергнуть. Книга запечатана магией, и открывается лишь тому, кто докажет, что достоин.', era: 'Эра До Эр', icon: '📖' },
  ]
  for (const l of legends) {
    await db.legend.upsert({
      where: { title: l.title },
      update: {},
      create: l,
    })
  }
  console.log('✓ Legends created')

  // === Quests ===
  const quests = [
    { title: 'Пропавший караван', description: 'Торговый караван из Эльдриона не дошёл до Каз-Думара. Найдите его и узнайте судьбу.', difficulty: 'EASY', reward: '120 серебряных монет', location: 'Тракт Камней' },
    { title: 'Гоблины в Шахте', description: 'Банда гоблинов обосновалась в заброшенной шахте к северу от Аэтерхолда. Прогоните их.', difficulty: 'EASY', reward: '80 серебряных + зелье лечения', location: 'Серебряная Шахта' },
    { title: 'Сердце Голема', description: 'В старой башне мага бродит голем, потерявший хозяина. Усмирите его и принесите ядро академии.', difficulty: 'MEDIUM', reward: '300 серебряных + свиток заклинания', location: 'Башня Кейрана' },
    { title: 'Кult в Подземелье', description: 'Культисты Безликих проводят ритуал под старым монастырём. Остановите их до полнолуния.', difficulty: 'HARD', reward: '600 серебряных + редкий артефакт', location: 'Монастырь Полуночи' },
    { title: 'Костяной Дракон', description: 'Древний костяной дракон поднялся из Тёмных Пустошей. Это — задание для ветеранов. Одному не справиться.', difficulty: 'DEADLY', reward: 'Золотой ранг + легендарное оружие', location: 'Хребет Дракона' },
  ]
  for (const q of quests) {
    await db.quest.create({ data: q }).catch(() => {})
  }
  console.log('✓ Quests created')

  // === Grimoire (locked) ===
  const grimoire = [
    { title: 'Страница I: О Первородном Молчании', encodedContent: 'Zkyq jvyqiv wlez jvmle vmzk pql wv eviiz kjrxl. Vmxlj kymwj, vmxlj rzxv, vmxlj jvyq.', realContent: 'В начале было не слово, но молчание. Боги не создали мир — они лишь нашли его спящим и дали ему имя. То, что спало, не умерло. Оно ждёт.', unlocked: false, unlockHint: 'Найди Серебряную Рощу и услышь её песню.', category: 'HISTORY', order: 1 },
    { title: 'Страница II: Об истинном имени Морганта', encodedContent: 'Wznn gzi nzmw, wznn gzi mewz — nz aewq vkgz pkmwj uqmif. Nz aewq qvqpv.', realContent: 'Моргант не мёртв. Моргант не спит — он лишь сменил личину. Он ждёт среди живущих под именем, которое вы произносите каждый день.', unlocked: false, unlockHint: 'Получи достижение «Укротитель Дракона».', category: 'SECRETS', order: 2 },
    { title: 'Страница III: Ритуал Разрыва', encodedContent: 'Qrwmqlk pkmza qlk wzk aqm, azqlk wzk pql, kmjj qlk wzk qvqpv. Pkx pkmz nkxq.', realContent: 'Ритуал, способный отнять силу у бога: шесть свечей из слёз, зеркало тёмной воды и имя, произнесённое назад. Но цена — душа заклинателя.', unlocked: false, unlockHint: 'Достигни ранга Мифического Чемпиона.', category: 'RITUALS', order: 3 },
    { title: 'Страница IV: Пророчество Седьмой Эры', encodedContent: 'Jwvkm, nlmv, qvql wlez mzm, nza wvk wrk vlmv kzk. Wvk wrk qvql kmzk wvk.', realContent: 'Когда тьма, что спит, откроет седьмой глаз, боги падут, и мир станет тем, кем был до них. Хранители Серебряного Пламени — последняя преграда.', unlocked: false, unlockHint: 'Открой предыдущие три страницы.', category: 'PROPHECY', order: 4 },
  ]
  for (const g of grimoire) {
    await db.grimoireEntry.upsert({
      where: { title: g.title },
      update: {},
      create: g,
    })
  }
  console.log('✓ Grimoire entries created')

  console.log('\n✨ Seeding complete! The world of Eldrin lives.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
