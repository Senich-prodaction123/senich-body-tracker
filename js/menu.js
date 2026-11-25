// Базовое меню на 7 дней (повторяется каждую неделю).
// Ингредиент: { f: продукт, q: количество, form: 'raw' | 'cooked' } или { r: рецепт, q: порция }.
// form: raw — сырой / сухой вес, cooked — готовый вес (пересчитывается в сырой по коэффициенту выхода).
// Вес мяса и рыбы в меню — готовый (так взвешивают на тарелке).

export const MEAL_SLOTS = [
  { id: 'b', name: 'Завтрак', time: '09:00' },
  { id: 'l', name: 'Обед', time: '13:00' },
  { id: 's', name: 'Перекус', time: '16:30' },
  { id: 'd', name: 'Ужин', time: '19:00' },
];

// 1 = понедельник … 7 = воскресенье
export const WEEKDAYS = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const WD_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const M = 'cooked'; // вес мяса/рыбы в меню
const C = 'cooked';
const R = 'raw';

export const BASE_MENU = {
  1: {
    b: { name: 'Овсянка на молоке, яйца, огурец', items: [{ f: 'egg', q: 2 }, { f: 'oats', q: 60, form: R }, { f: 'milk', q: 150 }, { f: 'cucumber', q: 100 }] },
    l: { name: 'Курица с гречкой и салатом', items: [{ f: 'chicken', q: 180, form: M }, { f: 'buckwheat', q: 200, form: C }, { r: 'salad', q: 200 }, { f: 'oil', q: 10 }] },
    s: { name: 'Творог с бананом', items: [{ f: 'curd', q: 150 }, { f: 'banana', q: 120 }] },
    d: { name: 'Рыба с картофелем и овощами', items: [{ f: 'fish', q: 180, form: M }, { f: 'potato', q: 250, form: C }, { f: 'vegmix', q: 200, form: C }] },
  },
  2: {
    b: { name: 'Сырники со сметаной и ягодами', items: [{ r: 'syrniki', q: 200 }, { f: 'sourcream', q: 15 }, { f: 'berries', q: 100 }] },
    l: { name: 'Говядина с рисом и овощами', items: [{ f: 'beef', q: 170, form: M }, { f: 'rice', q: 200, form: C }, { f: 'vegmix', q: 200, form: C }, { f: 'oil', q: 10 }] },
    s: { name: 'Греческий йогурт, яблоко, орехи', items: [{ f: 'greekyog', q: 200 }, { f: 'apple', q: 150 }, { f: 'walnut', q: 15 }] },
    d: { name: 'Курица с макаронами и салатом', items: [{ f: 'chicken', q: 150, form: M }, { f: 'pasta', q: 180, form: C }, { r: 'salad', q: 200 }] },
  },
  3: {
    b: { name: 'Омлет, хлеб, помидоры', items: [{ r: 'omelet', q: 1 }, { f: 'bread', q: 60 }, { f: 'tomato', q: 150 }] },
    l: { name: 'Индейка с картофелем и салатом', items: [{ f: 'turkey', q: 180, form: M }, { f: 'potato', q: 250, form: C }, { r: 'salad', q: 200 }, { f: 'oil', q: 10 }] },
    s: { name: 'Творог с ягодами и мёдом', items: [{ f: 'curd', q: 200 }, { f: 'berries', q: 100 }, { f: 'honey', q: 10 }] },
    d: { name: 'Говядина с гречкой и овощами', items: [{ f: 'beef', q: 160, form: M }, { f: 'buckwheat', q: 200, form: C }, { f: 'vegmix', q: 200, form: C }] },
  },
  4: {
    b: { name: 'Овсянка на молоке, яйца, яблоко', items: [{ f: 'oats', q: 60, form: R }, { f: 'milk', q: 200 }, { f: 'egg', q: 2 }, { f: 'apple', q: 100 }] },
    l: { name: 'Курица с рисом и салатом', items: [{ f: 'chicken', q: 180, form: M }, { f: 'rice', q: 200, form: C }, { r: 'salad', q: 200 }, { f: 'oil', q: 10 }] },
    s: { name: 'Греческий йогурт, банан, миндаль', items: [{ f: 'greekyog', q: 200 }, { f: 'banana', q: 100 }, { f: 'almond', q: 15 }] },
    d: { name: 'Рыба с картофелем и овощами', items: [{ f: 'fish', q: 200, form: M }, { f: 'potato', q: 250, form: C }, { f: 'vegmix', q: 200, form: C }] },
  },
  5: {
    b: { name: 'Творог с бананом и овсянкой', items: [{ f: 'curd', q: 200 }, { f: 'banana', q: 100 }, { f: 'oats', q: 40, form: R }] },
    l: { name: 'Говядина с гречкой и овощами', items: [{ f: 'beef', q: 170, form: M }, { f: 'buckwheat', q: 200, form: C }, { f: 'vegmix', q: 200, form: C }, { f: 'oil', q: 10 }] },
    s: { name: 'Яйца, хлеб, огурец', items: [{ f: 'egg', q: 2 }, { f: 'bread', q: 50 }, { f: 'cucumber', q: 100 }] },
    d: { name: 'Курица с запечёнными овощами и рисом', items: [{ f: 'chicken', q: 170, form: M }, { r: 'roastveg', q: 250 }, { f: 'rice', q: 150, form: C }] },
  },
  6: {
    b: { name: 'Яйца, хлеб, сыр, овощи', items: [{ f: 'egg', q: 3 }, { f: 'bread', q: 70 }, { f: 'cheese', q: 25 }, { r: 'vegfresh', q: 150 }] },
    l: { name: 'Домашний плов с говядиной', items: [{ r: 'plov', q: 300 }, { r: 'salad', q: 150 }] },
    s: { name: 'Творог, йогурт, ягоды', items: [{ f: 'curd', q: 150 }, { f: 'yogurt', q: 100 }, { f: 'berries', q: 100 }] },
    d: { name: 'Индейка с картофелем и салатом', items: [{ f: 'turkey', q: 180, form: M }, { f: 'potato', q: 200, form: C }, { r: 'salad', q: 200 }] },
  },
  7: {
    b: { name: 'Овсянка на молоке, яйца, ягоды', items: [{ f: 'oats', q: 60, form: R }, { f: 'milk', q: 200 }, { f: 'egg', q: 2 }, { f: 'berries', q: 100 }] },
    l: { name: 'Курица с макаронами и салатом', items: [{ f: 'chicken', q: 180, form: M }, { f: 'pasta', q: 200, form: C }, { r: 'salad', q: 200 }] },
    s: { name: 'Греческий йогурт, орехи, яблоко', items: [{ f: 'greekyog', q: 200 }, { f: 'walnut', q: 15 }, { f: 'apple', q: 150 }] },
    d: { name: 'Рыба с гречкой и овощами', items: [{ f: 'fish', q: 180, form: M }, { f: 'buckwheat', q: 150, form: C }, { f: 'vegmix', q: 200, form: C }] },
  },
};
