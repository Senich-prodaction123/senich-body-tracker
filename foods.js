// База продуктов SENICH BODY TRACKER.
// Пищевая ценность — на 100 г (или 100 мл) продукта в том виде, в каком его покупают:
// мясо и рыба — сырые, крупы и макароны — сухие. Источник: справочные таблицы
// химического состава (Скурихин) и USDA, округлено. Все значения можно править в приложении.
//
// unit:    g | ml | pcs  — базовая единица
// pieceG:  вес одной штуки (для pcs), г
// yield:   коэффициент выхода: сколько граммов готового получается из 1 г сырого/сухого
// waste:   доля отходов при очистке (для закупки: купить = съесть / (1 − waste))
// store:   long — длительное хранение, fresh — скоропортящееся
// pack:    обычная упаковка в магазине (размер в базовой единице) — для «≈ упаковок»
// howto:   как приготовить (собирается в рецепт приёма пищи)

export const CATS = [
  { id: 'meat', name: 'Мясо и птица' },
  { id: 'fish', name: 'Рыба' },
  { id: 'dairy', name: 'Яйца и молочные продукты' },
  { id: 'grain', name: 'Крупы и макароны' },
  { id: 'veg', name: 'Овощи' },
  { id: 'fruit', name: 'Фрукты и ягоды' },
  { id: 'nuts', name: 'Орехи и масла' },
  { id: 'other', name: 'Дополнительные продукты' },
];

export const FOODS = {
  chicken: { name: 'Куриное филе', cat: 'meat', kcal: 113, p: 23.6, unit: 'g', yield: 0.75, store: 'fresh',
    pack: { size: 1000, label: 'кг' },
    howto: 'Куриное филе посолить, поперчить, запечь в духовке при 200° 20–25 минут или отварить 20 минут.' },
  beef: { name: 'Говядина (мякоть, без жира)', cat: 'meat', kcal: 158, p: 20.2, unit: 'g', yield: 0.7, store: 'fresh',
    pack: { size: 1000, label: 'кг' },
    howto: 'Говядину нарезать кусочками, потушить под крышкой с небольшим количеством воды 60–70 минут до мягкости.' },
  turkey: { name: 'Филе индейки', cat: 'meat', kcal: 112, p: 23.5, unit: 'g', yield: 0.75, store: 'fresh',
    pack: { size: 1000, label: 'кг' },
    howto: 'Филе индейки посолить, запечь при 200° 25 минут или потушить 20 минут.' },
  fish: { name: 'Рыба белая (минтай, хек — филе)', cat: 'fish', kcal: 72, p: 15.9, unit: 'g', yield: 0.8, store: 'fresh',
    pack: { size: 1000, label: 'кг' },
    howto: 'Филе рыбы посолить, сбрызнуть лимоном, запечь при 190° 15–20 минут (можно в фольге).' },

  egg: { name: 'Яйца куриные', cat: 'dairy', kcal: 157, p: 12.7, unit: 'pcs', pieceG: 55, store: 'fresh',
    pack: { size: 10, label: 'десяток' },
    howto: 'Яйца сварить 8–9 минут или пожарить на сухой антипригарной сковороде.' },
  milk: { name: 'Молоко 2,5%', cat: 'dairy', kcal: 52, p: 2.8, unit: 'ml', store: 'fresh',
    pack: { size: 1000, label: 'л' } },
  curd: { name: 'Творог 5%', cat: 'dairy', kcal: 121, p: 17.2, unit: 'g', store: 'fresh',
    pack: { size: 400, label: 'пачка 400 г' } },
  sourcream: { name: 'Сметана 15%', cat: 'dairy', kcal: 160, p: 2.6, unit: 'g', store: 'fresh',
    pack: { size: 300, label: 'банка 300 г' } },
  greekyog: { name: 'Греческий йогурт 2%', cat: 'dairy', kcal: 70, p: 7.5, unit: 'g', store: 'fresh',
    pack: { size: 400, label: 'банка 400 г' } },
  yogurt: { name: 'Йогурт натуральный 2,5%', cat: 'dairy', kcal: 60, p: 4.3, unit: 'g', store: 'fresh',
    pack: { size: 400, label: 'банка 400 г' } },
  cheese: { name: 'Сыр твёрдый (Российский)', cat: 'dairy', kcal: 356, p: 23, unit: 'g', store: 'fresh',
    pack: { size: 200, label: 'кусок 200 г' } },

  oats: { name: 'Овсяные хлопья (Геркулес)', cat: 'grain', kcal: 352, p: 12.3, unit: 'g', store: 'long',
    pack: { size: 500, label: 'пачка 500 г' },
    howto: 'Овсянку залить молоком (или водой), варить 5–7 минут, помешивая.' },
  buckwheat: { name: 'Гречка', cat: 'grain', kcal: 313, p: 12.6, unit: 'g', yield: 2.6, store: 'long',
    pack: { size: 800, label: 'пачка 800 г' },
    howto: 'Гречку промыть, залить водой 1 : 2, варить под крышкой 15–18 минут.' },
  rice: { name: 'Рис длиннозёрный', cat: 'grain', kcal: 344, p: 6.7, unit: 'g', yield: 2.9, store: 'long',
    pack: { size: 900, label: 'пачка 900 г' },
    howto: 'Рис промыть, залить водой 1 : 2, варить под крышкой 15–18 минут.' },
  pasta: { name: 'Макароны из твёрдых сортов', cat: 'grain', kcal: 344, p: 12, unit: 'g', yield: 2.3, store: 'long',
    pack: { size: 450, label: 'пачка 450 г' },
    howto: 'Макароны варить в подсоленной воде по времени на упаковке (8–10 минут).' },
  bread: { name: 'Хлеб цельнозерновой', cat: 'grain', kcal: 240, p: 9, unit: 'g', store: 'fresh',
    pack: { size: 350, label: 'буханка 350 г' } },
  flour: { name: 'Мука пшеничная', cat: 'grain', kcal: 334, p: 10.3, unit: 'g', store: 'long',
    pack: { size: 1000, label: 'пачка 1 кг' } },
  potato: { name: 'Картофель', cat: 'veg', kcal: 77, p: 2, unit: 'g', yield: 0.95, waste: 0.2, store: 'fresh',
    pack: { size: 1000, label: 'кг' },
    howto: 'Картофель очистить, отварить 20 минут или запечь дольками при 200° 30–35 минут.' },

  cucumber: { name: 'Огурцы', cat: 'veg', kcal: 15, p: 0.8, unit: 'g', store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  tomato: { name: 'Помидоры', cat: 'veg', kcal: 20, p: 0.9, unit: 'g', store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  cabbage: { name: 'Капуста белокочанная', cat: 'veg', kcal: 27, p: 1.8, unit: 'g', waste: 0.1, store: 'fresh',
    pack: { size: 1500, label: 'кочан ~1,5 кг' } },
  carrot: { name: 'Морковь', cat: 'veg', kcal: 35, p: 1.3, unit: 'g', waste: 0.15, store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  onion: { name: 'Лук репчатый', cat: 'veg', kcal: 41, p: 1.4, unit: 'g', waste: 0.15, store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  zucchini: { name: 'Кабачок', cat: 'veg', kcal: 24, p: 0.6, unit: 'g', waste: 0.1, store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  pepper: { name: 'Перец болгарский', cat: 'veg', kcal: 27, p: 1.3, unit: 'g', waste: 0.15, store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  vegmix: { name: 'Овощная смесь замороженная (брокколи, цветная капуста, морковь, фасоль)', cat: 'veg',
    kcal: 30, p: 2, unit: 'g', yield: 1, store: 'long', storeNote: 'морозилка',
    pack: { size: 400, label: 'пакет 400 г' },
    howto: 'Замороженные овощи приготовить на пару или потушить 8–10 минут без масла, посолить.' },

  banana: { name: 'Бананы', cat: 'fruit', kcal: 96, p: 1.5, unit: 'g', waste: 0.35, store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  apple: { name: 'Яблоки', cat: 'fruit', kcal: 47, p: 0.4, unit: 'g', waste: 0.1, store: 'fresh',
    pack: { size: 1000, label: 'кг' } },
  berries: { name: 'Ягоды замороженные (смесь)', cat: 'fruit', kcal: 45, p: 0.8, unit: 'g', store: 'long', storeNote: 'морозилка',
    pack: { size: 300, label: 'пакет 300 г' } },

  walnut: { name: 'Грецкие орехи', cat: 'nuts', kcal: 656, p: 15.2, unit: 'g', store: 'long',
    pack: { size: 200, label: 'пачка 200 г' } },
  almond: { name: 'Миндаль', cat: 'nuts', kcal: 609, p: 18.6, unit: 'g', store: 'long',
    pack: { size: 150, label: 'пачка 150 г' } },
  oil: { name: 'Оливковое масло', cat: 'nuts', kcal: 899, p: 0, unit: 'g', store: 'long',
    pack: { size: 460, label: 'бутылка 0,5 л' },
    howto: 'Салат заправить маслом прямо перед едой.' },
  honey: { name: 'Мёд', cat: 'other', kcal: 329, p: 0.8, unit: 'g', store: 'long',
    pack: { size: 250, label: 'банка 250 г' } },
  lemon: { name: 'Лимон', cat: 'fruit', kcal: 34, p: 0.9, unit: 'g', store: 'fresh',
    pack: { size: 1, label: 'шт' }, noCount: true },
  spices: { name: 'Соль, чёрный перец, зира (для плова)', cat: 'other', kcal: 0, p: 0, unit: 'g', store: 'long',
    pack: { size: 1, label: '' }, noCount: true },
};

// Сложные блюда — рецепт на одну порцию.
// portion — вес готовой порции (или 1 порция), items — сырые/сухие ингредиенты на эту порцию.
export const RECIPES = {
  salad: { name: 'Овощной салат', portion: 200, unit: 'g',
    items: [{ f: 'cucumber', q: 80 }, { f: 'tomato', q: 80 }, { f: 'cabbage', q: 40 }],
    steps: ['Огурец и помидор нарезать, капусту тонко нашинковать, посолить, перемешать.'] },
  vegfresh: { name: 'Свежие овощи (огурец, помидор)', portion: 150, unit: 'g',
    items: [{ f: 'cucumber', q: 75 }, { f: 'tomato', q: 75 }],
    steps: ['Огурец и помидор нарезать дольками.'] },
  syrniki: { name: 'Сырники', portion: 200, unit: 'g',
    items: [{ f: 'curd', q: 180 }, { f: 'egg', q: 1 }, { f: 'flour', q: 25 }, { f: 'oil', q: 5 }],
    steps: [
      'Творог размять вилкой, добавить яйцо и 20 г муки, щепотку соли, перемешать.',
      'Слепить 5–6 небольших сырников, обвалять в оставшейся муке.',
      'Жарить на слегка смазанной маслом сковороде по 3 минуты с каждой стороны на среднем огне.',
    ] },
  omelet: { name: 'Омлет из 3 яиц', portion: 1, unit: 'portion',
    items: [{ f: 'egg', q: 3 }, { f: 'milk', q: 30 }],
    steps: ['Яйца взбить с молоком и щепоткой соли.', 'Вылить на разогретую антипригарную сковороду, готовить под крышкой 4–5 минут на слабом огне.'] },
  plov: { name: 'Домашний плов с говядиной', portion: 300, unit: 'g',
    items: [{ f: 'rice', q: 60 }, { f: 'beef', q: 80 }, { f: 'carrot', q: 50 }, { f: 'onion', q: 30 }, { f: 'oil', q: 8 }, { f: 'spices', q: 0 }],
    steps: [
      'В казане или толстостенной кастрюле разогреть масло, обжарить говядину кусочками 5 минут.',
      'Добавить лук полукольцами и морковь соломкой, жарить 5–7 минут, посолить, добавить зиру.',
      'Залить водой, чтобы покрыла мясо, тушить 30 минут.',
      'Высыпать промытый рис ровным слоем, долить воды на 1,5 см выше риса, варить на среднем огне до впитывания воды, затем 20 минут под крышкой на слабом огне.',
    ] },
  roastveg: { name: 'Запечённые овощи', portion: 250, unit: 'g',
    items: [{ f: 'zucchini', q: 120 }, { f: 'pepper', q: 80 }, { f: 'carrot', q: 60 }, { f: 'onion', q: 40 }, { f: 'oil', q: 5 }],
    steps: ['Кабачок, перец, морковь и лук нарезать крупно, посолить, перемешать с маслом.', 'Запечь при 200° 25–30 минут.'] },
};
