export type FridgeItem = {
  id: string;
  emoji: string;
  label: string;
  zone: 'freezer' | 'interior' | 'door';
};

export const ALL_ITEMS: FridgeItem[] = [
  { id: 'milk', emoji: '🥛', label: 'Milk', zone: 'door' },
  { id: 'egg', emoji: '🥚', label: 'Egg', zone: 'door' },
  { id: 'cheese', emoji: '🧀', label: 'Cheese', zone: 'door' },
  { id: 'garlic', emoji: '🧄', label: 'Garlic', zone: 'door' },
  { id: 'onion', emoji: '🧅', label: 'Onion', zone: 'door' },
  { id: 'butter', emoji: '🧈', label: 'Butter', zone: 'door' },
  { id: 'tomato', emoji: '🍅', label: 'Tomato', zone: 'door' },
  { id: 'potato', emoji: '🥔', label: 'Potato', zone: 'door' },
  { id: 'sauce', emoji: '🫙', label: 'Sauce', zone: 'door' },
  { id: 'juice', emoji: '🧃', label: 'Juice', zone: 'door' },
  { id: 'yogurt', emoji: '🫙', label: 'Yogurt', zone: 'door' },
  { id: 'beef', emoji: '🥩', label: 'Beef', zone: 'freezer' },
  { id: 'shrimp', emoji: '🦐', label: 'Shrimp', zone: 'freezer' },
  { id: 'icecream', emoji: '🍦', label: 'Ice Cream', zone: 'freezer' },
  { id: 'fish', emoji: '🐟', label: 'Fish', zone: 'freezer' },
  { id: 'dumpling', emoji: '🥟', label: 'Dumpling', zone: 'freezer' },
  { id: 'chicken', emoji: '🍗', label: 'Chicken', zone: 'interior' },
  { id: 'carrot', emoji: '🥕', label: 'Carrot', zone: 'interior' },
  { id: 'mushroom', emoji: '🍄', label: 'Mushroom', zone: 'interior' },
  { id: 'noodle', emoji: '🍜', label: 'Noodle', zone: 'interior' },
  { id: 'tofu', emoji: '🫘', label: 'Tofu', zone: 'interior' },
  { id: 'spinach', emoji: '🥬', label: 'Spinach', zone: 'interior' },
  { id: 'apple', emoji: '🍎', label: 'Apple', zone: 'interior' },
  { id: 'pepper', emoji: '🫑', label: 'Pepper', zone: 'interior' },
  { id: 'corn', emoji: '🌽', label: 'Corn', zone: 'interior' },
  { id: 'lemon', emoji: '🍋', label: 'Lemon', zone: 'interior' },
  { id: 'pork', emoji: '🥓', label: 'Pork', zone: 'interior' },
  { id: 'sausage', emoji: '🌭', label: 'Sausage', zone: 'interior' },
  { id: 'broccoli', emoji: '🥦', label: 'Broccoli', zone: 'interior' },
  { id: 'grape', emoji: '🍇', label: 'Grape', zone: 'interior' },
];

const DEFAULT_IDS = [
  'milk',
  'egg',
  'cheese',
  'garlic',
  'onion',
  'butter',
  'tomato',
  'beef',
  'shrimp',
  'chicken',
  'carrot',
  'mushroom',
  'noodle',
  'tofu',
  'spinach',
];

export const DEFAULT_FRIDGE_ITEMS = ALL_ITEMS.filter((i) =>
  DEFAULT_IDS.includes(i.id),
).map((item, idx) => ({
  ...item,
  slotKey: `${item.zone}-${idx}`,
}));
