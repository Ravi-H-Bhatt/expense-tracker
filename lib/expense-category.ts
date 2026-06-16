/**
 * Shared expense categorization.
 *
 * Maps a free-text expense description to a single category using keyword
 * synonym groups. Centralizing this keeps charts, tables and PDF reports
 * perfectly consistent (e.g. "cab", "rickshaw", "uber", "flight" all roll up
 * into "Travel").
 */

// Order matters: the first group whose keyword is found wins.
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  {
    category: 'Travel',
    keywords: [
      'travel', 'transport', 'transportation', 'commute', 'ride',
      'cab', 'taxi', 'uber', 'ola', 'lyft', 'rapido',
      'rickshaw', 'auto', 'tuk', 'tuktuk',
      'bus', 'train', 'metro', 'tram', 'subway', 'railway', 'irctc',
      'flight', 'flights', 'plane', 'airfare', 'airline', 'airlines', 'airport',
      'fuel', 'petrol', 'diesel', 'gas', 'gasoline',
      'toll', 'parking', 'fare', 'ferry', 'boat', 'bike', 'scooter', 'car rental', 'rental car',
    ],
  },
  {
    category: 'Food',
    keywords: [
      'food', 'meal', 'meals', 'dinner', 'lunch', 'breakfast', 'brunch', 'snack', 'snacks',
      'restaurant', 'cafe', 'pizza', 'burger', 'swiggy', 'zomato', 'dominos', 'mcdonald', 'kfc',
      'eat', 'eating', 'dining', 'buffet', 'biryani', 'thali', 'dessert', 'icecream', 'ice cream', 'bakery',
    ],
  },
  {
    category: 'Drinks',
    keywords: [
      'drink', 'drinks', 'beverage', 'beverages', 'coffee', 'tea', 'chai', 'juice', 'shake', 'smoothie',
      'bar', 'pub', 'beer', 'wine', 'alcohol', 'liquor', 'cocktail', 'whiskey', 'vodka', 'rum',
      'soda', 'water bottle', 'starbucks',
    ],
  },
  {
    category: 'Groceries',
    keywords: ['grocery', 'groceries', 'supermarket', 'vegetable', 'vegetables', 'fruits', 'milk', 'bigbasket', 'dmart', 'mart'],
  },
  {
    category: 'Stay',
    keywords: [
      'stay', 'hotel', 'hostel', 'lodge', 'lodging', 'resort', 'airbnb', 'room', 'rooms',
      'accommodation', 'guesthouse', 'guest house', 'homestay', 'booking', 'oyo',
    ],
  },
  {
    category: 'Shopping',
    keywords: ['shop', 'shopping', 'clothes', 'clothing', 'apparel', 'mall', 'amazon', 'flipkart', 'myntra', 'store', 'purchase', 'souvenir', 'gift', 'gifts'],
  },
  {
    category: 'Entertainment',
    keywords: [
      'movie', 'movies', 'cinema', 'film', 'entertainment', 'fun', 'game', 'games', 'gaming',
      'concert', 'show', 'event', 'party', 'club', 'amusement', 'theme park', 'ticket', 'tickets',
      'museum', 'zoo', 'sightseeing', 'tour', 'activity', 'activities',
    ],
  },
  {
    category: 'Utilities',
    keywords: ['electricity', 'water bill', 'internet', 'wifi', 'recharge', 'mobile', 'phone bill', 'bill', 'rent', 'maintenance'],
  },
  {
    category: 'Health',
    keywords: ['medical', 'medicine', 'pharmacy', 'doctor', 'hospital', 'health', 'clinic', 'chemist'],
  },
];

/**
 * Categorize a single expense description. Returns the matched category name,
 * or "Other" when nothing matches.
 */
export function categorizeExpense(description: string | null | undefined): string {
  const desc = String(description || '').toLowerCase();
  if (!desc.trim()) return 'Other';

  for (const group of CATEGORY_KEYWORDS) {
    if (group.keywords.some((kw) => desc.includes(kw))) {
      return group.category;
    }
  }
  return 'Other';
}

/**
 * Build a category -> total amount breakdown from a list of expenses, sorted
 * descending by amount. Each expense needs `description` and `total_amount`.
 */
export function buildCategoryBreakdown(
  expenses: { description?: string | null; total_amount: number | string }[]
): { category: string; amount: number }[] {
  const map: Record<string, number> = {};
  for (const exp of expenses) {
    const category = categorizeExpense(exp.description);
    map[category] = (map[category] || 0) + Number(exp.total_amount);
  }
  return Object.entries(map)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
