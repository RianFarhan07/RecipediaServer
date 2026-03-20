/**
 * Extracts nutrition values from Spoonacular's HTML summary string.
 * Example: "...has <b>287 calories</b>, <b>21g of protein</b>, and <b>17g of fat</b>..."
 */
export interface NutritionSummary {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export function extractNutritionFromSummary(summary: string | null | undefined): NutritionSummary {
  if (!summary) return { calories: null, protein: null, fat: null, carbs: null };

  const match = (pattern: RegExp) => {
    const m = summary.match(pattern);
    return m ? Math.round(parseFloat(m[1])) : null;
  };

  return {
    calories: match(/<b>([\d.]+)\s*calories<\/b>/i),
    protein: match(/<b>([\d.]+)\s*g\s*of\s*protein<\/b>/i),
    fat: match(/<b>([\d.]+)\s*g\s*of\s*fat<\/b>/i),
    carbs: match(/<b>([\d.]+)\s*g\s*of\s*carbohydrates<\/b>/i),
  };
}
