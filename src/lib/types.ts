export interface Plan {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  startWeekday: number;
}

export interface Meal {
  id: number;
  name: string;
  description: string | null;
  mealType: string;
  deadlineAt: number;
  startedAt: number | null;
  foodId: number;
}

export interface Food {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  minDuration: number;
  maxDuration: number;
}

export interface FoodStep {
  id: number;
  foodId: number;
  name: string;
  description: string | null;
  duration: number;
  minDuration: number;
  maxDuration: number;
  offsetTime: number;
}

export interface ScheduledStep {
  foodName: string;
  stepName: string;
  stepDescription: string | null;
  notifyAtMinutes: number;
  duration: number;
}

export interface MealPlanStep {
  id: number;
  name: string;
  description: string | null;
  startAt: number;
  endAt: number;
  duration: number;
  offsetTime: number;
}

export interface MealPlanDetails {
  meal: Meal;
  food: Food;
  cookStartAt: number;
  cookEndAt: number;
  steps: MealPlanStep[];
}

export interface PlanMealDetail {
  planMealId: number;
  weekday: number;
  details: MealPlanDetails;
}

export interface MealWithPlan {
  planMealId: number;
  weekday: number;
  meal: Meal;
}

export interface ImportStep {
  name: string;
  description?: string;
  duration?: number;
  minDuration?: number;
  maxDuration?: number;
  offsetTime?: number;
}

export interface ImportFood {
  name: string;
  slug: string;
  description?: string;
  minDuration?: number;
  maxDuration?: number;
  steps?: ImportStep[];
}

export interface ImportPlan {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  startWeekday?: number;
}

export interface ImportMeal {
  planSlug: string;
  weekday: number;
  name: string;
  description?: string;
  mealType: string;
  deadlineAt: number;
  foodSlug: string;
}

export interface ImportPayload {
  plans?: ImportPlan[];
  foods?: ImportFood[];
  meals?: ImportMeal[];
}

export interface ImportResult {
  plansCreated: number;
  plansSkipped: number;
  foodsCreated: number;
  foodsSkipped: number;
  mealsCreated: number;
  mealsSkipped: number;
  errors: string[];
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍪",
};

export function minutesToTime(m: number | null | undefined): string {
  if (m == null) return "—";
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60);
  const min = mm % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToInput(m: number): string {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}
