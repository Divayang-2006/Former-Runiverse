// Centralized fitness calculation helpers
// These values can later be personalized based on user profile (height, weight, age, gender)

export const DEFAULT_STRIDE_M = 0.78; // average adult walking stride length in meters
export const CALORIES_PER_STEP = 0.04; // rough average (adjust with MET formula for accuracy)

export function estimateDistanceFromSteps(steps: number, strideM: number = DEFAULT_STRIDE_M) {
  return steps * strideM; // meters
}

export function estimateCaloriesFromSteps(steps: number, calPerStep: number = CALORIES_PER_STEP) {
  return steps * calPerStep; // kcal
}
