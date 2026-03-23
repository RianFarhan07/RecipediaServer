import { Injectable, BadRequestException } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { SpoonacularService } from '../recipes/spoonacular.service';

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  low: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

const MACRO_SPLIT: Record<
  string,
  { protein: number; carbs: number; fat: number }
> = {
  lose_weight: { protein: 0.4, carbs: 0.3, fat: 0.3 },
  maintain: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  gain_muscle: { protein: 0.3, carbs: 0.45, fat: 0.25 },
};

function calcGoalCalories(
  tdee: number,
  weeklyGoal: number | null | undefined,
  fitnessGoal: string | null | undefined,
): number {
  const goal = fitnessGoal ?? 'maintain';
  if (goal === 'maintain' || !weeklyGoal) return tdee;

  // 1 kg = 7700 kcal → delta per hari
  const dailyDelta = Math.round((weeklyGoal * 7700) / 7);

  if (goal === 'lose_weight') {
    const deficit = Math.min(dailyDelta, 750);
    return Math.max(tdee - deficit, 1200);
  }
  if (goal === 'gain_muscle') {
    const surplus = Math.min(dailyDelta, 500);
    return tdee + surplus;
  }
  return tdee;
}

@Injectable()
export class AiService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly spoonacular: SpoonacularService,
  ) {}

  // ============================================
  // 1. Generate by Nutrients (BMI + Recipe)
  // ============================================

  // Ganti method generateByNutrients:
  async generateByNutrients(user: any) {
    const {
      height,
      gender,
      weight,
      age,
      activityLevel,
      diet,
      allergies,
      fitnessGoal,
      targetWeight,
      weeklyGoal,
    } = user;

    if (!height || !gender || !weight || !age || !activityLevel) {
      throw new BadRequestException(
        'Please complete your profile first (height, weight, age, gender, activity level)',
      );
    }

    // 1. Hitung TDEE
    const bmr =
      gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    const tdee = Math.round(
      bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55),
    );

    // 2. Hitung target kalori berdasarkan goal
    const targetCalories = calcGoalCalories(tdee, weeklyGoal, fitnessGoal);
    const calorieAdjustment = targetCalories - tdee;

    // 3. BMI
    const bmiValue = parseFloat(
      (weight / Math.pow(height / 100, 2)).toFixed(1),
    );
    const bmiCategory =
      bmiValue < 18.5
        ? 'Underweight'
        : bmiValue < 25
          ? 'Normal'
          : bmiValue < 30
            ? 'Overweight'
            : 'Obese';

    // 4. Macro split berdasarkan goal
    const split = MACRO_SPLIT[fitnessGoal ?? 'maintain'];
    const proteinGrams = Math.round((targetCalories * split.protein) / 4);
    const carbsGrams = Math.round((targetCalories * split.carbs) / 4);
    const fatGrams = Math.round((targetCalories * split.fat) / 9);

    // 5. Cross-check protein minimum (1.6g/kg)
    const minProteinByWeight = Math.round(weight * 1.6);
    const finalProteinGrams = Math.max(proteinGrams, minProteinByWeight);

    // 6. Estimasi waktu capai target
    let weeksToGoal: number | null = null;
    let estimatedDate: string | null = null;
    if (
      targetWeight &&
      fitnessGoal &&
      fitnessGoal !== 'maintain' &&
      weeklyGoal
    ) {
      const delta = Math.abs(weight - targetWeight);
      weeksToGoal = Math.ceil(delta / weeklyGoal);
      const target = new Date();
      target.setDate(target.getDate() + weeksToGoal * 7);
      estimatedDate = target.toISOString().slice(0, 10);
    }

    // 7. Per-meal kalori (÷3, window berdasarkan goal)
    const windowPct = fitnessGoal === 'lose_weight' ? 0.15 : 0.2;
    const perMealCalories = Math.round(targetCalories / 3);
    const minCalories = Math.round(perMealCalories * (1 - windowPct));
    const maxCalories = Math.round(perMealCalories * (1 + windowPct));

    // 8. Spoonacular search params berdasarkan goal
    const searchParams: Record<string, any> = {
      minCalories,
      maxCalories,
      number: 9,
      addRecipeInformation: true,
      fillIngredients: true,
      addRecipeNutrition: true,
    };

    if (fitnessGoal === 'lose_weight') {
      searchParams.sort = 'healthiness';
      searchParams.minProtein = Math.round((finalProteinGrams * 0.8) / 3);
      searchParams.maxCarbs = Math.round((carbsGrams * 1.1) / 3);
    } else if (fitnessGoal === 'gain_muscle') {
      searchParams.sort = 'time';
      searchParams.minProtein = Math.round((finalProteinGrams * 0.9) / 3);
    } else {
      searchParams.sort = 'popularity';
    }

    const allergiesStr = allergies?.join(',') ?? '';
    if (diet) searchParams.diet = diet;
    if (allergiesStr) searchParams.intolerances = allergiesStr;

    const searchResult = (await this.spoonacular.searchByNutrients(
      searchParams,
    )) as { results: unknown[] } | undefined;
    const recipes: unknown[] = searchResult?.results ?? [];

    return {
      nutritionInfo: {
        bmi: bmiValue,
        bmiCategory,
        tdee,
        targetCalories,
        calorieAdjustment,
        fitnessGoal: fitnessGoal ?? 'maintain',
        currentWeight: weight,
        targetWeight: targetWeight ?? null,
        weeklyGoal: weeklyGoal ?? null,
        weeksToGoal,
        estimatedGoalDate: estimatedDate,
        macroSplit: {
          protein: Math.round(split.protein * 100),
          carbs: Math.round(split.carbs * 100),
          fat: Math.round(split.fat * 100),
        },
        macronutrients: {
          protein: {
            percentage: Math.round(split.protein * 100),
            grams: finalProteinGrams,
            perMeal: {
              min: Math.round((finalProteinGrams * 0.8) / 3),
              max: Math.round((finalProteinGrams * 1.2) / 3),
            },
          },
          carbs: {
            percentage: Math.round(split.carbs * 100),
            grams: carbsGrams,
            perMeal: {
              min: Math.round((carbsGrams * 0.8) / 3),
              max: Math.round((carbsGrams * 1.2) / 3),
            },
          },
          fat: {
            percentage: Math.round(split.fat * 100),
            grams: fatGrams,
            perMeal: {
              min: Math.round((fatGrams * 0.8) / 3),
              max: Math.round((fatGrams * 1.2) / 3),
            },
          },
        },
        caloriesPerMeal: { min: minCalories, max: maxCalories },
      },
      recipes,
    };
  }

  // ============================================
  // 2. Ingredient Recommendations
  // ============================================
  async ingredientRecommendations(user: any) {
    const { height, gender, weight, age, activityLevel, diet, allergies } =
      user;

    if (!height || !gender || !weight || !age || !activityLevel) {
      throw new BadRequestException('Please complete your profile first');
    }

    const allergiesStr = allergies?.join(', ') ?? 'none';

    const prompt = `
    Based on the following user profile, recommend 5 healthy ingredients:
    - Gender: ${gender}
    - Age: ${age} years old
    - Weight: ${weight} kg
    - Height: ${height} cm
    - Activity level: ${activityLevel}
    - Diet preference: ${diet ?? 'no specific diet'}
    - Food allergies: ${allergiesStr}

    Format the response as a valid JSON array of strings containing ONLY the 5 ingredient names in English.
    Example: ["spinach", "salmon", "quinoa", "blueberries", "almonds"]
    Return ONLY the JSON array with no other text.
    `;

    const response = await this.gemini.generateText(prompt);
    const ingredients = this.gemini.parseJSON<string[]>(response);
    const ingredientsParam = ingredients.join(',');

    const recipes = await this.spoonacular.findByIngredients(
      ingredientsParam,
      6,
    );

    return {
      recommendedIngredients: ingredients,
      recipes,
    };
  }

  // ============================================
  // 3. Find by Description (Natural Language)
  // ============================================
  async findByDescription(description: string) {
    const prompt = `
    Based on this food description: "${description}"
    
    Please analyze and extract (TRANSLATE TO ENGLISH):
    1. Main ingredients
    2. Cuisine type
    3. Meal type (breakfast, lunch, dinner, snack)
    4. Dietary preferences
    5. Keywords for recipe search
    
    Format as JSON with keys:
    - "ingredients": array of ingredient strings IN ENGLISH
    - "cuisine": string or null
    - "type": meal type string or null
    - "diet": dietary restriction string or null
    - "query": main search query IN ENGLISH
    - "excludeIngredients": array of ingredients to exclude
    
    Return ONLY the JSON object with no other text.
    `;

    const response = await this.gemini.generateText(prompt);
    const searchParams = this.gemini.parseJSON<any>(response);

    const recipes = await this.spoonacular.searchRecipes({
      query: searchParams.query,
      cuisine: searchParams.cuisine,
      diet: searchParams.diet !== 'healthy' ? searchParams.diet : undefined,
      type: searchParams.type,
      number: 12,
    });

    return {
      searchParams,
      recipes,
    };
  }

  // ============================================
  // 4. Ingredient Emoji
  // ============================================
  async getIngredientEmoji(
    ingredient: string,
  ): Promise<{ name: string; emoji: string }> {
    const prompt = `
    Give me the single most appropriate food emoji for the ingredient: "${ingredient}".
    Return ONLY a JSON object with these exact keys:
    - "name": the ingredient name as given
    - "emoji": a single emoji character
    Example: {"name": "avocado", "emoji": "🥑"}
    Return ONLY the JSON object with no other text.
    `;
    const response = await this.gemini.generateText(prompt);
    return this.gemini.parseJSON<{ name: string; emoji: string }>(response);
  }

  // ============================================
  // 5. Identify Dish from Image (Snap & Cook)
  // ============================================
  async identifyDish(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const imageBase64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;

    const prompt = `
    Look at this food image and identify the dish or meal you see.
    Focus on the final cooked dish, not the raw ingredients.

    Return ONLY a JSON object with these exact keys:
    - "dishName": the name of the dish (can be in original language, e.g. "Nasi Goreng", "Ramen", "Pho Bo")
    - "englishQuery": the best English search term for finding this dish's recipe on a recipe website (e.g. "Indonesian fried rice", "Japanese ramen noodles", "Vietnamese beef pho"). Always in English.
    - "confidence": "high", "medium", or "low"
    - "description": one short sentence describing the dish in English

    Example: {"dishName": "Nasi Goreng", "englishQuery": "Indonesian fried rice", "confidence": "high", "description": "Indonesian fried rice seasoned with sweet soy sauce, shrimp paste, and spices."}

    If you cannot identify any food dish, return {"dishName": null, "englishQuery": null, "confidence": "low", "description": null}
    Return ONLY the JSON object with no other text.
    `;

    const response = await this.gemini.generateWithImage(
      prompt,
      imageBase64,
      mimeType,
    );

    let result: {
      dishName: string | null;
      englishQuery: string | null;
      confidence: string;
      description: string | null;
    };
    try {
      result = this.gemini.parseJSON<typeof result>(response);
    } catch {
      result = {
        dishName: null,
        englishQuery: null,
        confidence: 'low',
        description: null,
      };
    }

    if (!result.dishName) {
      return {
        dishName: null,
        englishQuery: null,
        confidence: 'low',
        description: null,
        recipes: [],
        message:
          'Could not identify a dish in this image. Try with a clearer photo.',
      };
    }

    // Use englishQuery for Spoonacular search (better results for non-English dish names)
    const searchQuery = result.englishQuery ?? result.dishName;
    let searchResult = await this.spoonacular.searchRecipes({
      query: searchQuery,
      number: 12,
    });

    // Fallback 1: strip nationality/origin prefix (e.g. "Indonesian fried rice" → "fried rice")
    if (!searchResult?.results?.length && result.englishQuery) {
      const words = result.englishQuery.split(' ');
      if (words.length > 2) {
        const stripped = words.slice(1).join(' ');
        searchResult = await this.spoonacular.searchRecipes({
          query: stripped,
          number: 12,
        });
      }
    }

    // Fallback 2: try just the core term (last 2 words)
    if (!searchResult?.results?.length && result.englishQuery) {
      const words = result.englishQuery.split(' ');
      if (words.length > 2) {
        const core = words.slice(-2).join(' ');
        searchResult = await this.spoonacular.searchRecipes({
          query: core,
          number: 12,
        });
      }
    }

    return {
      dishName: result.dishName,
      englishQuery: result.englishQuery,
      confidence: result.confidence,
      description: result.description,
      recipes: searchResult?.results ?? [],
      message: `Identified: ${result.dishName}`,
    };
  }

  // ============================================
  // 6. Analyze Image
  // ============================================
  async analyzeImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const imageBase64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;

    const prompt = `
    Analyze this image and identify all the food ingredients you can see.
    Please identify common cooking ingredients like vegetables, fruits, meats, dairy products, grains, spices, etc.

    Return ONLY a JSON array of ingredient names as strings, with no other text.
    Format: ["ingredient1", "ingredient2", "ingredient3"]

    Focus on ingredients commonly used in cooking recipes.
    If you cannot identify any food ingredients, return an empty array [].
    `;

    const response = await this.gemini.generateWithImage(
      prompt,
      imageBase64,
      mimeType,
    );

    let ingredients: string[] = [];
    try {
      ingredients = this.gemini.parseJSON<string[]>(response);
      if (!Array.isArray(ingredients)) ingredients = [];
    } catch {
      ingredients = [];
    }

    if (ingredients.length === 0) {
      return {
        ingredients: [],
        recipes: [],
        message: 'No ingredients identified. Please try with a clearer image.',
      };
    }

    const recipes = await this.spoonacular.findByIngredients(
      ingredients.join(','),
      6,
    );

    return {
      ingredients,
      recipes,
      message: `Found ${ingredients.length} ingredients and ${recipes.length} recipe suggestions`,
    };
  }

  async generateByNutrientsMealType(user: any, mealType: string) {
    const {
      height,
      gender,
      weight,
      age,
      activityLevel,
      diet,
      allergies,
      fitnessGoal,
      weeklyGoal,
    } = user;

    if (!height || !gender || !weight || !age || !activityLevel) {
      throw new BadRequestException('Please complete your profile first');
    }

    // Hitung TDEE + target calories (sama seperti generateByNutrients)
    const bmr =
      gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    const tdee = Math.round(
      bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55),
    );
    const targetCalories = calcGoalCalories(tdee, weeklyGoal, fitnessGoal);

    // Per-meal split
    const MEAL_SPLIT: Record<string, number> = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.4,
    };
    const split = MEAL_SPLIT[mealType] ?? 0.33;
    const perMealCalories = Math.round(targetCalories * split);

    const windowPct = fitnessGoal === 'lose_weight' ? 0.15 : 0.2;
    const minCalories = Math.round(perMealCalories * (1 - windowPct));
    const maxCalories = Math.round(perMealCalories * (1 + windowPct));

    // Meal type mapping untuk Spoonacular
    const SPOONACULAR_TYPE: Record<string, string> = {
      breakfast: 'breakfast',
      lunch: 'main course,salad,soup',
      dinner: 'main course',
    };

    const searchParams: Record<string, any> = {
      minCalories,
      maxCalories,
      number: 7, // 7 hari
      type: SPOONACULAR_TYPE[mealType] ?? 'main course',
      addRecipeInformation: true,
      fillIngredients: true,
      addRecipeNutrition: true,
    };

    if (fitnessGoal === 'lose_weight') {
      searchParams.sort = 'healthiness';
    } else if (fitnessGoal === 'gain_muscle') {
      searchParams.sort = 'time';
    } else {
      searchParams.sort = 'popularity';
    }

    const allergiesStr = allergies?.join(',') ?? '';
    if (diet) searchParams.diet = diet;
    if (allergiesStr) searchParams.intolerances = allergiesStr;

    const result = (await this.spoonacular.searchByNutrients(searchParams)) as
      | { results: unknown[] }
      | undefined;

    return {
      mealType,
      recipes: result?.results ?? [],
    };
  }
}
