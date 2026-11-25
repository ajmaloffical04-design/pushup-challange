export type PushUpType = 'shoulder' | 'bicep' | 'tricep' | 'wings';

export type NavTab = 'workout' | 'animations' | 'log' | 'dashboard';

export interface UserProfile {
  userId: string;
  dailyRepGoal: number;
  dailyProteinGoal: number;
  bodyWeightKg: number;
  reminderEnabled: boolean;
  reminderTime: string; // 24h HH:MM
  reminderPushUpType: PushUpType;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkoutSet {
  id: string;
  userId: string;
  dateKey: string; // YYYY-MM-DD
  setNumber: number;
  pushUpType: PushUpType;
  reps: number;
  durationMs: number;
  caloriesBurned: number;
  notes: string;
  createdAtMs: number;
}

export interface ProteinLog {
  id: string;
  userId: string;
  dateKey: string; // YYYY-MM-DD
  foodName: string;
  serving: string;
  proteinGrams: number;
  calories: number;
  relatedSetId: string;
  createdAtMs: number;
}

export interface PushUpVariationMeta {
  id: PushUpType;
  label: string;
  variationName: string;
  targetMuscles: string;
  kcalMultiplier: number; // relative metabolic demand vs standard push-up
  accentColor: string;
  handPosition: string;
  cues: string[];
  recommendedProteinTip: string;
}

export const PUSH_UP_VARIATIONS: Record<PushUpType, PushUpVariationMeta> = {
  shoulder: {
    id: 'shoulder',
    label: 'Shoulder',
    variationName: 'Pike Push-Up',
    targetMuscles: 'Anterior & Lateral Deltoids',
    kcalMultiplier: 1.18,
    accentColor: '#E53935',
    handPosition: 'Shoulder-width, hips high in inverted V',
    cues: [
      'Hinge hips high so your torso forms a steep angle over your shoulders.',
      'Lower the crown of your head forward between your hands, not straight down.',
      'Drive powerfully through your palms to lock out overhead without shrugging.',
    ],
    recommendedProteinTip: 'Pair shoulder sessions with 25g fast-digesting whey or 3 eggs within 45 min.',
  },
  bicep: {
    id: 'bicep',
    label: 'Bicep',
    variationName: 'Reverse-Grip Push-Up',
    targetMuscles: 'Biceps Brachii & Forearms',
    kcalMultiplier: 1.12,
    accentColor: '#EA580C',
    handPosition: 'Fingers rotated outward/back, hands lower by ribs',
    cues: [
      'Rotate fingers outward at 45°–90° and shift weight slightly forward over wrists.',
      'Keep elbows close to your torso to load the biceps under tension on the descent.',
      'Control a 2-second lowering tempo and squeeze your arms at the top.',
    ],
    recommendedProteinTip: 'Greek yogurt with almonds or a scoop of whey supports arm fiber repair.',
  },
  tricep: {
    id: 'tricep',
    label: 'Tricep',
    variationName: 'Diamond Close-Grip',
    targetMuscles: 'Triceps Brachii (Long & Lateral Heads)',
    kcalMultiplier: 1.15,
    accentColor: '#2563EB',
    handPosition: 'Thumbs and index fingers forming a tight diamond under sternum',
    cues: [
      'Place hands directly beneath your chest so thumbs and index fingers touch.',
      'Tuck elbows backward along your ribs—avoid flaring them outward.',
      'Press to full elbow extension and pause briefly at peak tricep contraction.',
    ],
    recommendedProteinTip: 'Lean chicken breast or tuna gives high leucine for dense tricep recovery.',
  },
  wings: {
    id: 'wings',
    label: 'Wings',
    variationName: 'Wide Lat-Stretch Push-Up',
    targetMuscles: 'Latissimus Dorsi (Wings) & Serratus',
    kcalMultiplier: 1.22,
    accentColor: '#0D9488',
    handPosition: 'Extra-wide stance (1.5× shoulder width), slight outward hand angle',
    cues: [
      'Set palms wide and depress your shoulder blades down toward your back pockets.',
      'Lower deep until your chest nearly brushes the floor to stretch the lats.',
      'Push through the floor and protract your shoulder blades fully at the top.',
    ],
    recommendedProteinTip: 'Wide-grip volume taxes large back muscles—aim for 30g+ complete protein.',
  },
};

export const PUSH_UP_ORDER: PushUpType[] = ['shoulder', 'bicep', 'tricep', 'wings'];

export interface CalorieEquivalentItem {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  category: 'drink' | 'snack' | 'meal';
}

export const CALORIE_EQUIVALENTS: CalorieEquivalentItem[] = [
  { id: 'coke_bottle', name: 'Coca-Cola Bottle', serving: '500 ml', kcal: 200, category: 'drink' },
  { id: 'coke_can', name: 'Coca-Cola Can', serving: '355 ml', kcal: 140, category: 'drink' },
  { id: 'glazed_donut', name: 'Glazed Donut', serving: '1 medium', kcal: 200, category: 'snack' },
  { id: 'boiled_egg', name: 'Boiled Egg', serving: '1 large', kcal: 78, category: 'snack' },
  { id: 'banana', name: 'Medium Banana', serving: '1 fruit', kcal: 105, category: 'snack' },
  { id: 'chocolate_bar', name: 'Milk Chocolate Bar', serving: '45 g', kcal: 235, category: 'snack' },
  { id: 'pizza_slice', name: 'Cheese Pizza Slice', serving: '1 slice', kcal: 285, category: 'meal' },
];

export interface ProteinFoodPreset {
  id: string;
  foodName: string;
  serving: string;
  proteinGrams: number;
  calories: number;
  category: string;
}

export const PROTEIN_FOOD_PRESETS: ProteinFoodPreset[] = [
  { id: 'whey', foodName: 'Whey Protein Shake', serving: '1 scoop (30g)', proteinGrams: 25, calories: 120, category: 'Shake' },
  { id: 'eggs', foodName: 'Boiled Eggs', serving: '2 large eggs', proteinGrams: 12, calories: 155, category: 'Whole Food' },
  { id: 'chicken', foodName: 'Grilled Chicken Breast', serving: '150 g cooked', proteinGrams: 46, calories: 248, category: 'Lean Meat' },
  { id: 'yogurt', foodName: 'Greek Yogurt Bowl', serving: '200 g plain', proteinGrams: 20, calories: 130, category: 'Dairy' },
  { id: 'paneer', foodName: 'Paneer / Cottage Cheese', serving: '100 g', proteinGrams: 18, calories: 265, category: 'Vegetarian' },
  { id: 'tuna', foodName: 'Tuna / Salmon Fillet', serving: '120 g', proteinGrams: 28, calories: 220, category: 'Seafood' },
  { id: 'peanut_butter', foodName: 'Peanut Butter & Oats', serving: '2 tbsp + 40g', proteinGrams: 14, calories: 330, category: 'Plant' },
  { id: 'lentils', foodName: 'Spiced Lentil & Chickpea Bowl', serving: '1 cup cooked', proteinGrams: 16, calories: 230, category: 'Plant' },
];

/**
 * Computes estimated kcal burned for a push-up set based on reps, variation metabolic multiplier,
 * duration, and body weight (default 72kg).
 * Standard vigorous push-ups burn ~0.45–0.65 kcal per rep for a 72kg adult, plus active plank time.
 */
export function calculatePushUpCalories(
  reps: number,
  pushUpType: PushUpType,
  durationMs: number,
  bodyWeightKg = 72
): number {
  if (reps <= 0 && durationMs <= 0) return 0;
  const weightFactor = Math.max(0.5, Math.min(2.5, bodyWeightKg / 72));
  const multiplier = PUSH_UP_VARIATIONS[pushUpType].kcalMultiplier;
  const repCalories = reps * 0.52 * multiplier * weightFactor;
  const activeMinutes = Math.min(durationMs / 60000, Math.max(reps * 0.08, 0.25));
  const isometricBonus = activeMinutes * 1.4 * weightFactor;
  const total = repCalories + isometricBonus;
  return Math.round(total * 10) / 10;
}

export function formatStopwatch(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPastDateKeys(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    result.push(getLocalDateKey(d));
  }
  return result;
}

export function formatShortDate(dateKey: string): { weekday: string; day: string; full: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const todayKey = getLocalDateKey();
  const weekday = dateKey === todayKey ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = String(date.getDate());
  const full = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { weekday, day, full };
}

export function describeCalorieEquivalent(kcal: number, item: CalorieEquivalentItem = CALORIE_EQUIVALENTS[0]): {
  ratio: number;
  percent: number;
  summary: string;
} {
  const ratio = item.kcal > 0 ? kcal / item.kcal : 0;
  const percent = Math.round(ratio * 100);
  if (ratio >= 1) {
    const formatted = ratio >= 10 ? Math.round(ratio).toString() : ratio.toFixed(1).replace(/\.0$/, '');
    return {
      ratio,
      percent,
      summary: `${formatted}× ${item.name} (${item.serving}) burned`,
    };
  }
  return {
    ratio,
    percent,
    summary: `${percent}% of 1 ${item.name} (${item.kcal} kcal)`,
  };
}

export function formatTime12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const formatReminderTime12h = formatTime12Hour;

export function getNextReminderCountdown(time24: string, now: Date = new Date()): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';

  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const diffMin = Math.max(1, Math.round((target.getTime() - now.getTime()) / 60000));
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours === 0) return `in ${mins}m`;
  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
}

export const getTimeUntilReminder = getNextReminderCountdown;

// Validation helpers synchronized verbatim with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  idMaxLength: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  dateKeyPattern: /^\d{4}-\d{2}-\d{2}$/,
  reminderTimePattern: /^([01]\d|2[0-3]):[0-5]\d$/,
  notesMaxLength: 200,
  foodNameMaxLength: 80,
  servingMaxLength: 60,
  minDailyRepGoal: 10,
  maxDailyRepGoal: 2000,
  minDailyProteinGoal: 20,
  maxDailyProteinGoal: 400,
  minBodyWeightKg: 30,
  maxBodyWeightKg: 250,
  maxReps: 2000,
  maxDurationMs: 7200000,
  maxCaloriesBurned: 5000,
  maxProteinGrams: 300,
  maxFoodCalories: 3000,
} as const;

export function generateSafeDocId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, BLUEPRINT_LIMITS.idMaxLength);
}
