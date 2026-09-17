// ============================================================
// ОБОРОТНИ (GAROU) — «Вервольф: Апокалипсис», 5-я ред. (W5).
// Данные интерактивного листа Гароу в разделе «Маскарад».
// Лист живёт в том же VtmSheet (JSON) с пометкой kind: "werewolf" —
// никак не пересекается с вампирским листом и другими разделами.
// Каталоги даров/обрядов — по мотивам классики (W20 → W5), сверься
// с Рассказчиком; свои дары всегда можно вписать вручную.
// ============================================================

import { SKILL_LIBRARY } from "./vtm-data";
import { vtmUid } from "./vtm-id";

// ---------- Племена ----------

export interface W5TribeDef {
  id: string;
  name: string;
  short: string;       // краткий портрет для листа
  wayward?: boolean;   // выпавшие из народа
}

export const W5_TRIBES: W5TribeDef[] = [
  { id: "black_furies", name: "Чёрные Фурии", short: "Воительницы и защитники угнетённых; лунные мистерии." },
  { id: "bone_gnawers", name: "Костяные Грызуны", short: "Низы городов: подвалы, помойки, выживание и чутьё на ложь." },
  { id: "children_of_gaia", name: "Дети Гайи", short: "Миротворцы: гасят ярость, лечат душу, собирают разноплеменные стаи." },
  { id: "galestalkers", name: "Вихревые Преследователи", short: "Охотники-штормовики (бывшие Вендигo): ни шагу назад от добычи." },
  { id: "ghost_council", name: "Призрачный Совет", short: "Хранители мёртвых знаний и запретных обрядов (бывшие Уктена)." },
  { id: "glass_walkers", name: "Стеклоходы", short: "Гароу городов: сети, железо, финансы; терпимы к «мертвецам»." },
  { id: "hart_wardens", name: "Хранители Сердец", short: "Барды и егеря (бывшие Фианна): любовь, ярость, лучшие охотничьи обряды." },
  { id: "red_talons", name: "Красные Когти", short: "Дикие охотники: города ненавидят, с нежитью не разговаривают." },
  { id: "shadow_lords", name: "Теневые Лорды", short: "Интриганы и прагматики: власть через заслуги и подставы." },
  { id: "silent_striders", name: "Безмолвные Странники", short: "Ходоки между мирами и вестники мёртвых." },
  { id: "silver_fangs", name: "Серебряные Клыки", short: "«Королевская кровь» Гароу: долг, родовитость, груз безумия династии." },
  { id: "black_spiral_dancers", name: "Чёрные Спиральные Танцоры", short: "Павшие: культ Вирма. Играется только как падение.", wayward: true },
  { id: "cult_of_fenris", name: "Культ Фенрира", short: "Безумные воины, решившие возглавить Апокалипсис.", wayward: true },
  { id: "stargazers", name: "Созерцатели", short: "Ушедшие из народа молчаливые мудрецы: сдерживать Ярость через созерцание.", wayward: true },
];

export const W5_TRIBE_BY_ID = new Map(W5_TRIBES.map((t) => [t.id, t]));

// ---------- Ауспиции ----------

export interface W5AuspiceDef {
  id: string;
  name: string;
  moon: string; // фаза луны
  role: string; // роль в стае
}

export const W5_AUSPICES: W5AuspiceDef[] = [
  { id: "ragabash", name: "Рагабаш", moon: "🌑 Новолуние", role: "Ловкач: разведка, диверсии, насмешка над правилами." },
  { id: "theurge", name: "Теург", moon: "🌒 Растущий серп", role: "Шаман: Умбра, духи, исцеление души." },
  { id: "philodox", name: "Филодокс", moon: "🌓 Полмесяца", role: "Судья: закон Литании, честная дуэль, разбор стай." },
  { id: "galliard", name: "Галлиард", moon: "🌔 Лунная сказка", role: "Сказитель: память народа, воодушевление, слово-оружие." },
  { id: "ahroun", name: "Ахрун", moon: "🌕 Полнолуние", role: "Воин: первый в бой, последний в отступлении." },
];

export const W5_AUSPICE_BY_ID = new Map(W5_AUSPICES.map((a) => [a.id, a]));

export const W5_BREEDS: { id: string; name: string; note: string }[] = [
  { id: "human", name: "Человекорождённый", note: "Вырос среди людей: Маскарад и закон знакомы, духи — нет." },
  { id: "wolf", name: "Волкорождённый", note: "Вырос волком: чутьё и Умбра родные, человеческий мир — чужой." },
];

// ---------- Облики (интерактивная панель «Облик дня») ----------

export const W5_FORMS: { id: string; name: string; ru: string; note: string }[] = [
  { id: "hishu", name: "Хишу", ru: "Человек", note: "Обычный облик: город, закон, Маскарад." },
  { id: "glabro", name: "Глабро", ru: "Почти-человек", note: "Качок с клыками: +Сила и Стойкость, социальные риски." },
  { id: "crinos", name: "Кринос", ru: "Боевая форма", note: "Два с половиной метра ярости. Каждый ход без убитого — 1 Воля, иначе безумие." },
  { id: "hispo", name: "Хиспо", ru: "Почти-волк", note: "Волк-переросток: бег, охота, чутьё." },
  { id: "lupus", name: "Люпус", ru: "Волк", note: "Настоящий волк: скорость, слух, духи слышат лучше всего." },
];

export const W5_FORM_BY_ID = new Map(W5_FORMS.map((f) => [f.id, f]));

/**
 * Модификаторы характеристик в облике — адаптация классики (W20 → девять лун W5).
 * Официальная таблица W5 местами расходится: сверяйся с Рассказчиком.
 * Ключ — id из W5_FORMS; числа — прибавки к «голым» характеристикам листа.
 */
export const W5_FORM_MODS: Record<string, Partial<W5Attributes>> = {
  hishu: {},
  glabro: { str: 2, sta: 1, man: -2 },
  crinos: { str: 4, sta: 3, dex: 1, man: -3 },
  hispo: { str: 3, dex: 2, sta: 2, man: -3 },
  lupus: { dex: 2, sta: 1, wit: 2, man: -3 },
};

/** Модификаторы конкретного облика (пусто для Хишу/неизвестного). */
export function w5FormMods(formId: string | undefined): Partial<W5Attributes> {
  if (!formId) return {};
  return W5_FORM_MODS[formId] || {};
}

/** Эффективное значение характеристики с учётом текущего облика листа. */
export function w5EffAttr(sheet: W5SheetData, key: keyof W5Attributes): number {
  const base = sheet.attributes[key] || 0;
  const mod = w5FormMods(sheet.info.activeForm)[key] || 0;
  return Math.max(0, Math.min(7, base + mod)); // в облике пул может подняться выше 5, но не выше 7
}

/** Стойкость в облике (для подсказки о максимальном Здоровье). */
export function w5EffStamina(sheet: W5SheetData): number {
  return w5EffAttr(sheet, "sta");
}

/** Имя активного облика или пустая строка. */
export function w5ActiveFormName(formId: string | undefined): string {
  if (!formId) return "";
  return W5_FORM_BY_ID.get(formId)?.name || "";
}

// ---------- Дары (каталог: Moon — по ауспиции, Tribe — по племени, Native — общие) ----------

export interface W5GiftDef {
  id: string;
  name: string;
  level: number;      // 1–5
  source: string;     // "native" | "moon:<auspice>" | "tribe:<tribeId>"
  desc: string;
}

export const W5_GIFT_LIBRARY: W5GiftDef[] = [
  // --- Общие (Native) ---
  { id: "native_sense_wyrm", name: "Чутьё на Вирма", level: 1, source: "native", desc: "Чуешь скверну: заражённых, места силы Вирма, лживые обеты." },
  { id: "native_resist_pain", name: "Сопротивление боли", level: 1, source: "native", desc: "Игнорируешь штрафы ран до конца сцены." },
  { id: "native_winter_wolf_air", name: "Дыхание зимнего волка", level: 1, source: "native", desc: "Вой, что охлаждает ярость: −1 кость к провокациям Ярости на сцену." },
  { id: "native_lunas_armor", name: "Броня Луна", level: 2, source: "native", desc: "Лунный свет оборачивается бронёй: тяжёлые раны гасятся первой луной в сцене." },
  { id: "native_sight_beyond", name: "Взгляд сквозь", level: 2, source: "native", desc: "Видишь духов и Пенумбру не меняя облика." },
  { id: "native_silver_tolerance", name: "Терпимость к серебру", level: 3, source: "native", desc: "Серебро жжёт меньше: первый урон от серебра за сцену — поверхностный." },
  { id: "native_ghoul_touch", name: "Мёртвая хватка", level: 3, source: "native", desc: "Твои когти парализуют: задетая конечность немеет на сцену." },
  { id: "native_bloody_feast", name: "Кровавая трапеза", level: 4, source: "native", desc: "Питьё крови врага лечит: поверхностная рана за глоток (Ярость-проверка)." },
  { id: "native_assimilation", name: "Вживание", level: 4, source: "native", desc: "Час среди людей/волков — и ты «свой»: без штрафов на маскировку вида." },
  { id: "native_marshal_domain", name: "Владыка владений", level: 5, source: "native", desc: "Земля отвечает тебе: духи места доносят и защищают в твоих владениях." },
  { id: "native_strength_of_will", name: "Стена воли", level: 5, source: "native", desc: "Воля становится щитом: потратить пункт воли = полностью отбить одну атаку духа или разума." },

  // --- Рагабаш (новолуние) ---
  { id: "moon_rag_blur", name: "Размытие Млечного Ока", level: 1, source: "moon:ragabash", desc: "Тебя невозможно удержать взглядом: −2 кости всем попыткам попасть или узнать." },
  { id: "moon_rag_open_seal", name: "Открытая печать", level: 1, source: "moon:ragabash", desc: "Замки, затворы, печати открываются от прикосновения." },
  { id: "moon_rag_scent_running", name: "Запах бегущей воды", level: 1, source: "moon:ragabash", desc: "Твой след не читается: псы и охотники теряют ноздрю." },
  { id: "moon_rag_gremlins", name: "Гремлины", level: 2, source: "moon:ragabash", desc: "Техника сходит с ума: машина глохнет, оружие клинит, лифт едет не туда." },
  { id: "moon_rag_lunar_influence", name: "Лунное влияние", level: 3, source: "moon:ragabash", desc: "Ты меняешь настроение толпы: страх, смех или ярость на твой выбор." },
  { id: "moon_rag_whelp_body", name: "Тело щенка", level: 4, source: "moon:ragabash", desc: "Оборотень превращается... в безобидного пса: идеальная маска." },

  // --- Теург (растущий серп) ---
  { id: "moon_the_mothers_touch", name: "Прикосновение Матери", level: 1, source: "moon:theurge", desc: "Исцеление: заживи поверхностные раны (тяжёлые — по договору с духами)." },
  { id: "moon_the_spirit_speech", name: "Речь духов", level: 1, source: "moon:theurge", desc: "Говори с духами без обряда: вопросы, сделки, сплетни Пенумбры." },
  { id: "moon_the_sight_from_beyond", name: "Зрение из-за горизонта", level: 2, source: "moon:theurge", desc: "Предзнаменования: +2 кости на одну проверку на сцену, если прислушался к знакам." },
  { id: "moon_the_exorcism", name: "Изгнание", level: 2, source: "moon:theurge", desc: "Выгоняешь духа из тела, места или предмета." },
  { id: "moon_the_grasp_the_beyond", name: "Хватка за гранью", level: 3, source: "moon:theurge", desc: "Носи вещи в Умбре и обратно: карман между мирами." },
  { id: "moon_the_spirit_ways", name: "Тропы духов", level: 4, source: "moon:theurge", desc: "Стая проходит в Умбру без обряда перехода." },

  // --- Филодокс (полмесяца) ---
  { id: "moon_phi_truth_of_gaia", name: "Истина Гайи", level: 1, source: "moon:philodox", desc: "Слышишь ложь: голос собеседника дрожит на неправде." },
  { id: "moon_phi_resist_pain2", name: "Щит ярости", level: 1, source: "moon:philodox", desc: "Впадая в ярость при защите своего, не теряешь контроля над ударами." },
  { id: "moon_phi_scent_of_truth", name: "Запах правды", level: 2, source: "moon:philodox", desc: "Вноси приговор: узнай, кто виновен в ссоре стаи или преступления." },
  { id: "moon_phi_strength_of_purpose", name: "Сила долга", level: 3, source: "moon:philodox", desc: "Ради исполнения Литании: +2 кости к одному пулу на сцену." },
  { id: "moon_phi_earthfriends", name: "Дружба с землёй", level: 4, source: "moon:philodox", desc: "Земля держит и говорит: ловушки из камня, путь через обвал." },

  // --- Галлиард (лунная сказка) ---
  { id: "moon_gal_inspiration", name: "Вдохновение", level: 1, source: "moon:galliard", desc: "Слово поднимает стаю: +1 кость к любым пулам союзников на сцену." },
  { id: "moon_gal_beast_speech", name: "Речь зверей", level: 1, source: "moon:galliard", desc: "Птицы, волки, крысы — все расскажут, что видели." },
  { id: "moon_gal_call_of_the_wyrm", name: "Зов Вирма", level: 2, source: "moon:galliard", desc: "Приманиваешь скверну: слуги Вирма идут на твой голос — в ловушку." },
  { id: "moon_gal_dreaming", name: "Сны-предания", level: 3, source: "moon:galliard", desc: "Посылаешь вещий сон: предупреждение или наставление на ночь." },
  { id: "moon_gal_shadows_by_the_fire", name: "Тени у костра", level: 4, source: "moon:galliard", desc: "Воспроизведи сцену из прошлого земли: свидетели видят её сами." },

  // --- Ахрун (полнолуние) ---
  { id: "moon_ah_razor_claws", name: "Бритвенные когти", level: 1, source: "moon:ahroun", desc: "Когти как бритва: раны тяжёлые, броня глупость." },
  { id: "moon_ah_inspiring_yell", name: "Вдохновляющий клич", level: 1, source: "moon:ahroun", desc: "Клич возвращает волю: союзник восстанавливает 1 Воли." },
  { id: "moon_ah_true_fear", name: "Истинный страх", level: 2, source: "moon:ahroun", desc: "Рык обращает врагов в бегство: смертные бегут, слабые духом падают ниц." },
  { id: "moon_ah_heart_of_fury", name: "Сердце ярости", level: 3, source: "moon:ahroun", desc: "Входи в боевой транс без риска безумия на одну сцену." },
  { id: "moon_ah_kiss_of_helios", name: "Поцелуй Гелиоса", level: 4, source: "moon:ahroun", desc: "Твоя ярость жжёт как полдень: духи тьмы и нежить получают тяжёлые раны от твоих когтей." },

  // --- Племенные (по одному-два на племя, уровни 1–4) ---
  { id: "tribe_furies_wasp_talons", name: "Жала Осы", level: 2, source: "tribe:black_furies", desc: "Укусы и удары несут лихорадку: жертва слабеет с каждым ходом." },
  { id: "tribe_furies_curse_era", name: "Проклятие Эриды", level: 3, source: "tribe:black_furies", desc: "Брось раздор: враги ссорятся между собой на сцену." },
  { id: "tribe_gnawers_friend_in_need", name: "Друг в беде", level: 1, source: "tribe:bone_gnawers", desc: "Крысы и бродяги донесут: город шепчет тебе своими подвалами." },
  { id: "tribe_gnawers_resist_toxin", name: "Крепкий желудок", level: 2, source: "tribe:bone_gnawers", desc: "Яды и порча почти не берут: −2 кости вражеским ядам." },
  { id: "tribe_gaia_empathy", name: "Эмпатия Гайи", level: 1, source: "tribe:children_of_gaia", desc: "Ты чувствуешь чужую боль: гасишь панику и ярость прикосновением." },
  { id: "tribe_gaia_dazzle", name: "Сияние мира", level: 3, source: "tribe:children_of_gaia", desc: "Аура покоя: никто в комнате не может первым поднять руку." },
  { id: "tribe_galestorm", name: "Вихрь бури", level: 2, source: "tribe:galestalkers", desc: "Позови ветер: порыв сбивает с ног и гасит огонь." },
  { id: "tribe_galest_downdraft", name: "Нисходящий поток", level: 4, source: "tribe:galestalkers", desc: "Буря на выбранную улицу: пути перекрыты, погоня верна." },
  { id: "tribe_ghost_council_whispers", name: "Шёпот мёртвых", level: 1, source: "tribe:ghost_council", desc: "Спроси могилу: мёртвые отвечают тем, что знали при жизни." },
  { id: "tribe_ghost_council_soul_binds", name: "Узы призрачного договора", level: 3, source: "tribe:ghost_council", desc: "Запечатай сделку с духом так, что нарушить нельзя." },
  { id: "tribe_glass_digital_eyes", name: "Цифровые глаза", level: 1, source: "tribe:glass_walkers", desc: "Смотришь глазами камер: город сам следит за твоей целью." },
  { id: "tribe_glass_cookery", name: "Сеть железа", level: 3, source: "tribe:glass_walkers", desc: "Прикажи устройству: свет, замки, сигнализация — всё твоё на сцену." },
  { id: "tribe_hart_blissful_argu", name: "Сладкая речь", level: 1, source: "tribe:hart_wardens", desc: "Твой голос усыпляет подозрения: −2 кости сопротивлению на переговорах." },
  { id: "tribe_hart_faesight", name: "Взгляд на скрытое", level: 2, source: "tribe:hart_wardens", desc: "Видишь скрытых существ и тропы за гранью обычного зрения." },
  { id: "tribe_red_thunderclap", name: "Раскат грома", level: 2, source: "tribe:red_talons", desc: "Вой, что встряхивает землю: все в зале теряют равновесие." },
  { id: "tribe_red_gore_fangs", name: "Кровавые клыки", level: 3, source: "tribe:red_talons", desc: "Твои укусы рвут жилы: раны не заживают без толка и заботы." },
  { id: "tribe_shadow_lords_shadow_cutting", name: "Разрез тени", level: 2, source: "tribe:shadow_lords", desc: "Твоя тень режет: брось её как оружие в полумраке." },
  { id: "tribe_shadow_lords_attunement", name: "Настрой на власть", level: 3, source: "tribe:shadow_lords", desc: "Чувствуй иерархию: кто главный, кто боится, кто готов предать." },
  { id: "tribe_striders_speed_of_thought", name: "Скорость мысли", level: 2, source: "tribe:silent_striders", desc: "Беги до рассвета без устали: города переходятся за ночь." },
  { id: "tribe_striders_dying_grace", name: "Милость уходящего", level: 3, source: "tribe:silent_striders", desc: "Провожай мёртвых: душа уходит без боли и возврата." },
  { id: "tribe_silver_fangs_lunas_blessing", name: "Благословение Луна", level: 1, source: "tribe:silver_fangs", desc: "Под полной луной ты неуязвим для страха: проверки Ярости на панику отменены." },
  { id: "tribe_silver_fangs_lordly_will", name: "Владычная воля", level: 3, source: "tribe:silver_fangs", desc: "Приказ короля: однострочный приказ смертному — он выполнит." },
];

export const W5_GIFT_BY_ID = new Map(W5_GIFT_LIBRARY.map((g) => [g.id, g]));

// ---------- Обряды ----------

export interface W5RiteDef {
  id: string;
  name: string;
  level: number;
  desc: string;
}

export const W5_RITE_LIBRARY: W5RiteDef[] = [
  { id: "rite_binding", name: "Обряд Сковывания", level: 1, desc: "Заточить духа в предмет (фетишизм начинается с малого)." },
  { id: "rite_cleansing", name: "Обряд Очищения", level: 1, desc: "Смыть скверну с человека, места или вещи." },
  { id: "rite_talisman", name: "Обряд Посвящения Талисмана", level: 1, desc: "Предметы следуют за тобой даже сквозь смену облика." },
  { id: "rite_questing_stone", name: "Обряд Ищущего Камня", level: 1, desc: "Маятник укажет путь: искать человека, вещь или духа." },
  { id: "rite_greeting_moon", name: "Приветствие Луны", level: 1, desc: "Ежемесячный ритуал стаи: благословение фазы луны." },
  { id: "rite_spirit_awakening", name: "Обряд Пробуждения Духа", level: 2, desc: "Разбуди дух в предмете или месте: машина, дом, река." },
  { id: "rite_summoning", name: "Обряд Призыва", level: 2, desc: "Позови духа: он придёт — но договор придётся заключить." },
  { id: "rite_contrition", name: "Обряд Раскаяния", level: 2, desc: "Попроси прощения у оскорблённого духа." },
  { id: "rite_the_fetish", name: "Обряд Фетиша", level: 3, desc: "Сделка с духом: сила запечатана в предмете." },
  { id: "rite_hunting_the_spirit", name: "Охота на Дух", level: 3, desc: "Охота в Умбре: добычей будет дух-цель." },
  { id: "rite_death_dire_wolf", name: "Похороны Волка", level: 3, desc: "Проводы павшего собрата: слава и покой." },
  { id: "rite_of_the_winter_wolf", name: "Обряд Зимнего Волка", level: 4, desc: "Старейшина передаёт силу молодым в час ухода." },
];

// ---------- Модель листа Гароу ----------

export interface W5GiftEntry {
  id: string;
  name: string;
  level: number;   // 1–5
  note: string;    // конкретика: как получен, особенности
}

export interface W5RiteEntry {
  id: string;
  name: string;
  level: number;   // 0–4
  note: string;
}

export interface W5ListItem {
  id: string;
  text: string;
}

export interface W5GearItem {
  id: string;
  name: string;
  count: string;
  note: string;
}

export interface W5Note {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface W5RollLogItem {
  id: string;
  text: string;
  ts: string;
}

/** Запись журнала опыта Гароу (как у вампиров, но в лунном листе). */
export interface W5XpLogItem {
  id: string;
  text: string;
  ts: string;
}

export interface W5Attributes {
  str: number; dex: number; sta: number;
  cha: number; man: number; com: number;
  int: number; wit: number; res: number;
}

export interface W5Trackers {
  rage: number;          // 0–5
  healthSup: number;     // поверхностный урон
  healthAgg: number;     // тяжёлый урон
  wpSup: number;         // урон воли
  glory: number;         // Слава Гордеца (Glory) 0–5
  honor: number;         // Слава Чести (Honor) 0–5
  wisdom: number;        // Слава Мудрости (Wisdom) 0–5
  xp: number;            // свободный опыт
  xpSpent: number;       // вложено опыта
  wolfLost: boolean;     // волк потерян (Ярость 0)
  harano: boolean;       // Харано — лунная тоска
}

export interface W5SheetData {
  kind: "werewolf";
  info: {
    name: string;
    concept: string;
    tribe: string;       // id из W5_TRIBES или ""
    auspice: string;     // id из W5_AUSPICES или ""
    breed: string;       // id из W5_BREEDS или ""
    age: string;
    pack: string;        // стая
    totem: string;       // тотем стаи
    chronicle: string;
    quote: string;
    /** «Облик дня» — активная форма (id из W5_FORMS); пусто/"hishu" = человек. */
    activeForm?: string;
    portrait?: string;
    portraitThumb?: string;
  };
  attributes: W5Attributes;
  skills: { id: string; value: number; spec: string }[];
  trackers: W5Trackers;
  gifts: W5GiftEntry[];
  rites: W5RiteEntry[];
  aspirations: W5ListItem[];   // до 3 стремлений
  touchstones: W5ListItem[];   // до 3 касаний (опоры)
  gear: W5GearItem[];
  notes: W5Note[];
  rollLog: W5RollLogItem[];   // хроника бросков (кости Луны)
  xpLog?: W5XpLogItem[];      // журнал опыта: покупки падают сами, очки не списываются
}

export const W5_MAX_HEALTH_BASE = 3; // Здоровье = Стойкость + 3

/** Максимальная Воля: по умолчанию Самообладание + Упорство (как в V5-системе), можно переопределить. */
export function w5WillpowerMax(sheet: W5SheetData): number {
  return (sheet.attributes.com || 0) + (sheet.attributes.res || 0);
}

/** Здоровье Гароу. */
export function w5HealthMax(sheet: W5SheetData): number {
  return (sheet.attributes.sta || 0) + W5_MAX_HEALTH_BASE;
}

/** Ранг по сумме Славы: 0 — щенок; 1 — ancillae стаи... (упрощённая лестница W5). */
export function w5Rank(glory: number, honor: number, wisdom: number): { rank: number; title: string } {
  const total = glory + honor + wisdom;
  if (total >= 12) return { rank: 5, title: "Старейшина вождей" };
  if (total >= 9) return { rank: 4, title: "Старейшина" };
  if (total >= 6) return { rank: 3, title: "Адурен" };
  if (total >= 3) return { rank: 2, title: "Фостерн" };
  if (total >= 1) return { rank: 1, title: "Клиаит" };
  return { rank: 0, title: "Щенок" };
}

/**
 * Верхний уровень Дара, который рангу положен (W5: уровень Дара ≈ рангу;
 * щенок с нулевой Славой может учить только Дары 1-го уровня).
 */
export function w5GiftLevelCap(rank: number): number {
  return Math.max(1, Math.min(5, rank));
}

// ---------- Стоимость прокачки Гароу (опыт, вкладка «Треки») ----------

export const W5_XP_COSTS = {
  attribute: (next: number) => next * 5,  // девять лун: 5 × новый уровень
  skill: (next: number) => next * 3,      // навыки: 3 × новый уровень
  specialization: 3,                       // специализация
  gift: (level: number) => level * 3,      // Дар: 3 × уровень Дара
  rite: (level: number) => level * 2,      // Обряд: 2 × уровень обряда
} as const;

/**
 * Авто-запись в журнал опыта Гароу (внутри mutate-черновика): покупка/подъём
 * НЕ списывает очки — цену сверяет Рассказчик. Дубли подряд гасятся.
 */
export function pushW5XpLog(d: W5SheetData, text: string): void {
  if (!Array.isArray(d.xpLog)) d.xpLog = [];
  if (d.xpLog[0]?.text === text) return; // без дублей подряд
  d.xpLog = [
    { id: vtmUid("wxp"), text, ts: new Date().toISOString() },
    ...d.xpLog,
  ].slice(0, 40);
}

/** Пустой лист Гароу. */
export function emptyW5Sheet(): W5SheetData {
  return {
    kind: "werewolf",
    info: { name: "Безымянный Гароу", concept: "", tribe: "", auspice: "", breed: "", age: "", pack: "", totem: "", chronicle: "", quote: "" },
    attributes: { str: 2, dex: 2, sta: 2, cha: 2, man: 2, com: 2, int: 2, wit: 2, res: 2 },
    skills: [],
    trackers: { rage: 1, healthSup: 0, healthAgg: 0, wpSup: 0, glory: 0, honor: 0, wisdom: 0, xp: 0, xpSpent: 0, wolfLost: false, harano: false },
    gifts: [],
    rites: [],
    aspirations: [],
    touchstones: [],
    gear: [],
    notes: [],
    rollLog: [],
  };
}

const clamp05 = (n: unknown) => Math.max(0, Math.min(5, Math.floor(Number(n) || 0)));

/** Нормализация листа Гароу из БД/импорта (устойчива к мусору). */
export function normalizeW5(raw: any): W5SheetData {
  const base = emptyW5Sheet();
  if (!raw || typeof raw !== "object") return base;
  const info = raw.info && typeof raw.info === "object" ? raw.info : {};
  const t = raw.trackers && typeof raw.trackers === "object" ? raw.trackers : {};
  const a = raw.attributes && typeof raw.attributes === "object" ? raw.attributes : {};
  const str = (x: unknown, max = 120) => (typeof x === "string" ? x.slice(0, max) : "");
  base.info = {
    name: str(info.name, 80) || base.info.name,
    concept: str(info.concept, 120),
    tribe: W5_TRIBE_BY_ID.has(info.tribe) ? info.tribe : "",
    auspice: W5_AUSPICE_BY_ID.has(info.auspice) ? info.auspice : "",
    breed: W5_BREEDS.some((b) => b.id === info.breed) ? info.breed : "",
    age: str(info.age, 40),
    pack: str(info.pack, 120),
    totem: str(info.totem, 120),
    chronicle: str(info.chronicle, 120),
    quote: str(info.quote, 300),
    activeForm: W5_FORM_BY_ID.has(info.activeForm) ? info.activeForm : undefined,
    portrait: typeof info.portrait === "string" ? info.portrait : undefined,
    portraitThumb: typeof info.portraitThumb === "string" ? info.portraitThumb : undefined,
  };
  base.xpLog = Array.isArray(raw.xpLog)
    ? raw.xpLog
        .slice(0, 40)
        .map((e: any) => ({
          id: str(e?.id, 60) || `wxp-${Math.random().toString(36).slice(2, 10)}`,
          text: str(e?.text, 220),
          ts: str(e?.ts, 40) || new Date().toISOString(),
        }))
        .filter((e: W5XpLogItem) => e.text)
    : undefined;
  base.attributes = {
    str: clamp05(a.str), dex: clamp05(a.dex), sta: clamp05(a.sta),
    cha: clamp05(a.cha), man: clamp05(a.man), com: clamp05(a.com),
    int: clamp05(a.int), wit: clamp05(a.wit), res: clamp05(a.res),
  };
  base.skills = Array.isArray(raw.skills)
    ? raw.skills
        .filter((s: any) => s && SKILL_LIBRARY.some((lib) => lib.id === s.id))
        .map((s: any) => ({ id: String(s.id), value: clamp05(s.value), spec: str(s.spec, 80) }))
    : [];
  base.trackers = {
    rage: clamp05(t.rage),
    healthSup: clamp05(t.healthSup), healthAgg: clamp05(t.healthAgg),
    wpSup: clamp05(t.wpSup),
    glory: clamp05(t.glory), honor: clamp05(t.honor), wisdom: clamp05(t.wisdom),
    xp: clamp05(t.xp), xpSpent: clamp05(t.xpSpent),
    wolfLost: t.wolfLost === true,
    harano: t.harano === true,
  };
  base.gifts = Array.isArray(raw.gifts)
    ? raw.gifts.slice(0, 40).map((g: any, i: number) => ({
        id: str(g.id, 60) || vtmUid(`gift-${i}`),
        name: str(g.name, 80) || "Дар",
        level: clamp05(g.level) || 1,
        note: str(g.note, 400),
      }))
    : [];
  base.rites = Array.isArray(raw.rites)
    ? raw.rites.slice(0, 30).map((r: any, i: number) => ({
        id: str(r.id, 60) || vtmUid(`rite-${i}`),
        name: str(r.name, 80) || "Обряд",
        level: Math.max(0, Math.min(4, Math.floor(Number(r.level) || 0))),
        note: str(r.note, 400),
      }))
    : [];
  base.aspirations = Array.isArray(raw.aspirations) ? raw.aspirations.slice(0, 3).map((x: any, i: number) => ({ id: str(x?.id, 40) || `asp-${i}`, text: str(x?.text, 200) })) : [];
  base.touchstones = Array.isArray(raw.touchstones) ? raw.touchstones.slice(0, 3).map((x: any, i: number) => ({ id: str(x?.id, 40) || `tst-${i}`, text: str(x?.text, 200) })) : [];
  base.gear = Array.isArray(raw.gear) ? raw.gear.slice(0, 60).map((g: any, i: number) => ({ id: str(g.id, 40) || `gear-${i}`, name: str(g.name, 80) || "Вещь", count: str(g.count, 40), note: str(g.note, 200) })) : [];
  base.notes = Array.isArray(raw.notes)
    ? raw.notes.slice(0, 100).map((n: any, i: number) => ({ id: str(n.id, 40) || `note-${i}`, title: str(n.title, 120), content: str(n.content, 4000), date: str(n.date, 40) }))
    : [];
  base.rollLog = Array.isArray(raw.rollLog)
    ? raw.rollLog.slice(0, 60).map((x: any, i: number) => ({ id: str(x?.id, 40) || `roll-${i}-${i}`, text: str(x?.text, 600), ts: str(x?.ts, 40) }))
    : [];
  return base;
}

// ---------- Случайный Гароу ----------

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const W5_CONCEPTS = [
  "вышибла ночного клуба", "ветеринар при зоопарке", "дальнобойщик междугородний", "рейнджер нацпарка",
  "байкер из банды «Серые Волки»", "социальный работник в приюте", "архитектор-реставратор", "пограничник-кинолог",
  "тренер по выживанию", "смотритель маяка", "уличный боец", "егерь-охотовед",
];

// подсказки отыгрыша к случайным дарам
const W5_GIFT_HINTS: Record<string, { concept: string }> = {};
void W5_GIFT_HINTS;

/** Случайный Гароу для кнопки «Пусть Луна решит». */
export function buildRandomWerewolf(): W5SheetData {
  const tribe = pick(W5_TRIBES.filter((t) => !t.wayward));
  const auspice = pick(W5_AUSPICES);
  const breed = pick(W5_BREEDS);

  // Бюджет характеристик: одна 4, три 3, четыре 2, одна 1
  const values = [4, 3, 3, 3, 2, 2, 2, 2, 1].sort(() => Math.random() - 0.5);
  const keys: (keyof W5Attributes)[] = ["str", "dex", "sta", "cha", "man", "com", "int", "wit", "res"];
  const attributes = {} as W5Attributes;
  keys.forEach((k, i) => { attributes[k] = values[i]; });
  // физические характеристики чуть поджимаем вверх — Гароу всё же воин
  if (attributes.str < 3 && Math.random() < 0.5) attributes.str += 1;

  const skills = pickN(SKILL_LIBRARY, 5 + Math.floor(Math.random() * 3)).map((s) => ({
    id: s.id,
    value: 1 + Math.floor(Math.random() * 2),
    spec: Math.random() < 0.4 ? pick(s.specExamples || []) : "",
  }));

  // Дары: два лунных своей ауспиции + один общий; обряд один
  const moonGifts = W5_GIFT_LIBRARY.filter((g) => g.source === `moon:${auspice.id}`);
  const nativeGifts = W5_GIFT_LIBRARY.filter((g) => g.source === "native");
  const giftPool = [...pickN(moonGifts, Math.min(2, moonGifts.length)), ...pickN(nativeGifts, 1)];
  const gifts: W5GiftEntry[] = giftPool.map((g) => ({
    id: vtmUid(`g-${g.id}`),
    name: g.name,
    level: g.level,
    note: g.desc,
  }));
  const rite = pick(W5_RITE_LIBRARY.filter((r) => r.level <= 2));
  const rites: W5RiteEntry[] = [
    { id: vtmUid(`r-${rite.id}`), name: rite.name, level: rite.level, note: rite.desc },
  ];

  const name = `${pick(["Радомир", "Тагир", "Велеса", "Марта", "Снит", "Кайран", "Одри", "Хольгер", "Эмбер", "Ярополк", "Лунни", "Гарри"])} «${pick(["Серый Шёпот", "Красный Клык", "Тихий Гон", "Пепельный Вой", "Северный Гнев", "Последний Ухо", "Хрустальный След", "Лунный Крюк"])}» ${pick(["Крат", "Велесов", "Стальбок", "Лисицын", "Дурманов", "Хольм", "Гроза"])}`;

  return normalizeW5({
    kind: "werewolf",
    info: {
      name,
      concept: pick(W5_CONCEPTS),
      tribe: tribe.id,
      auspice: auspice.id,
      breed: breed.id,
      age: `${18 + Math.floor(Math.random() * 20)}`,
      pack: "",
      totem: "",
      chronicle: "",
      quote: pick([
        "«Луна не прощает. Луна запоминает».",
        "«Город — это лес, где деревья из бетона. Мы не ушли — мы сменили корни на кабели».",
        "«Когда завою — услышат все. Даже мёртвые».",
        "«Вирм не приходит с войной. Он приходит с ипотекой».",
      ]),
    },
    attributes,
    skills,
    trackers: { rage: 1 + Math.floor(Math.random() * 2), healthSup: 0, healthAgg: 0, wpSup: 0, glory: Math.floor(Math.random() * 2), honor: Math.floor(Math.random() * 2), wisdom: Math.floor(Math.random() * 2), xp: 0, xpSpent: 0, wolfLost: false, harano: false },
    gifts,
    rites,
    aspirations: [
      { id: "asp-1", text: "Отомстить за " + pick(["сожжённую рощу", "убитую стаю", "осквернённый лунный камень", "загубленную реку"]) },
      { id: "asp-2", text: "Найти и защитить " + pick(["сестру-кинфолк", "лунный мост", "старого духа реки", "потерянного наставника"]) },
      { id: "asp-3", text: "Доказать стае, что " + pick(["город можно спасти", "Теневые Лорды лгут", "человеческая семья — не слабость", "моё племя право"]) },
    ],
    touchstones: [],
    gear: [],
    notes: [],
    rollLog: [],
  });
}
