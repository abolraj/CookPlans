import { invoke } from "@tauri-apps/api/core";
import type { Plan, Meal, MealWithPlan, Food, FoodStep, ScheduledStep, ImportPayload, ImportResult } from "./types";

export const api = {
  listPlans: () => invoke<Plan[]>("list_plans"),
  createPlan: (input: { name: string; description?: string; slug: string }) =>
    invoke<Plan>("create_plan", { input }),
  updatePlan: (input: { id: number; name: string; description?: string; slug: string }) =>
    invoke<void>("update_plan", { input }),
  deletePlan: (id: number) => invoke<void>("delete_plan", { id }),
  setActivePlan: (id: number) => invoke<void>("set_active_plan", { id }),

  listMealsForPlan: (planId: number) => invoke<MealWithPlan[]>("list_meals_for_plan", { planId }),
  getMeal: (mealId: number) => invoke<Meal>("get_meal", { mealId }),
  getMealFoodIds: (mealId: number) => invoke<number[]>("get_meal_food_ids", { mealId }),
  createMeal: (input: {
    planId: number;
    weekday: number;
    name: string;
    description?: string;
    mealType: string;
    deadlineAt: number;
    foodIds: number[];
  }) => invoke<Meal>("create_meal", { input }),
  updateMeal: (input: {
    mealId: number;
    name: string;
    description?: string;
    mealType: string;
    deadlineAt: number;
    foodIds: number[];
  }) => invoke<Meal>("update_meal", { input }),
  deleteMeal: (mealId: number) => invoke<void>("delete_meal", { mealId }),

  listFoods: () => invoke<Food[]>("list_foods"),
  getFood: (id: number) => invoke<Food>("get_food", { id }),
  createFood: (input: {
    name: string;
    slug: string;
    description?: string;
    minDuration: number;
    maxDuration: number;
  }) => invoke<Food>("create_food", { input }),
  updateFood: (input: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    minDuration: number;
    maxDuration: number;
  }) => invoke<void>("update_food", { input }),
  deleteFood: (id: number) => invoke<void>("delete_food", { id }),

  listStepsForFood: (foodId: number) => invoke<FoodStep[]>("list_steps_for_food", { foodId }),
  createStep: (input: {
    foodId: number;
    name: string;
    description?: string;
    duration: number;
    minDuration: number;
    maxDuration: number;
    offsetTime: number;
  }) => invoke<FoodStep>("create_step", { input }),
  updateStep: (input: {
    id: number;
    name: string;
    description?: string;
    duration: number;
    minDuration: number;
    maxDuration: number;
    offsetTime: number;
  }) => invoke<void>("update_step", { input }),
  deleteStep: (id: number) => invoke<void>("delete_step", { id }),

  computeMealSchedule: (mealId: number) => invoke<ScheduledStep[]>("compute_meal_schedule", { mealId }),

  importData: (payload: ImportPayload) => invoke<ImportResult>("import_data", { payload }),
};
