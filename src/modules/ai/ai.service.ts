import { Injectable, BadRequestException } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { SpoonacularService } from '../recipes/spoonacular.service';

@Injectable()
export class AiService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly spoonacular: SpoonacularService,
  ) {}

  // ============================================
  // 1. Generate by Nutrients (BMI + Recipe)
  // ============================================
  async generateByNutrients(user: any) {
    const { height, gender, weight, age, activityLevel, diet, allergies } =
      user;

    if (!height || !gender || !weight || !age || !activityLevel) {
      throw new BadRequestException(
        'Please complete your profile first (height, weight, age, gender, activity level)',
      );
    }

    const allergiesStr = allergies?.join(',') ?? '';

    const prompt = `
    Calculate nutrition values for a ${gender}, ${age} years old, ${weight} kg, ${height} cm tall, with activity level: ${activityLevel}.
    Please provide the following values:
    1. Daily calories
    2. BMI value and category (Underweight, Normal, Overweight, or Obese)
    3. Daily carbohydrate grams (50% of calories)
    4. Daily protein grams (20% of calories)
    5. Daily fat grams (30% of calories)
    
    Format the response as a valid JSON object with these exact keys: 
    dailyCalories, bmi, bmiCategory, carbsGrams, proteinGrams, fatGrams.
    Return ONLY the JSON object with no other text.
    `;

    const response = await this.gemini.generateText(prompt);
    const nutritionData = this.gemini.parseJSON<any>(response);

    const { dailyCalories, carbsGrams, proteinGrams, fatGrams } = nutritionData;

    // Per meal target (3 meals/day) — use wide calorie window only.
    // Combining calories + carbs + protein + fat simultaneously causes 0 results on Spoonacular.
    const minCalories = Math.round((dailyCalories * 0.7) / 3);
    const maxCalories = Math.round((dailyCalories * 1.3) / 3);

    // Keep macro data for response but don't use as Spoonacular filters
    const minCarbs = Math.round((carbsGrams * 0.8) / 3);
    const maxCarbs = Math.round((carbsGrams * 1.2) / 3);
    const minProtein = Math.round((proteinGrams * 0.8) / 3);
    const maxProtein = Math.round((proteinGrams * 1.2) / 3);
    const minFat = Math.round((fatGrams * 0.8) / 3);
    const maxFat = Math.round((fatGrams * 1.2) / 3);

    const searchParams: Record<string, any> = {
      minCalories,
      maxCalories,
      number: 9,
      addRecipeInformation: true,
      fillIngredients: true,
    };
    if (diet) searchParams.diet = diet;
    if (allergiesStr) searchParams.intolerances = allergiesStr;

    const searchResult = (await this.spoonacular.searchByNutrients(
      searchParams,
    )) as { results: unknown[] } | undefined;
    const recipes: unknown[] = searchResult?.results ?? [];

    return {
      nutritionInfo: {
        bmi: parseFloat(nutritionData.bmi ?? 0),
        bmiCategory: nutritionData.bmiCategory ?? 'Unknown',
        dailyCalories,
        macronutrients: {
          carbs: {
            percentage: 50,
            grams: carbsGrams,
            perMeal: { min: minCarbs, max: maxCarbs },
          },
          protein: {
            percentage: 20,
            grams: proteinGrams,
            perMeal: { min: minProtein, max: maxProtein },
          },
          fat: {
            percentage: 30,
            grams: fatGrams,
            perMeal: { min: minFat, max: maxFat },
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
  async getIngredientEmoji(ingredient: string): Promise<{ name: string; emoji: string }> {
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

    const response = await this.gemini.generateWithImage(prompt, imageBase64, mimeType);

    let result: { dishName: string | null; englishQuery: string | null; confidence: string; description: string | null };
    try {
      result = this.gemini.parseJSON<typeof result>(response);
    } catch {
      result = { dishName: null, englishQuery: null, confidence: 'low', description: null };
    }

    if (!result.dishName) {
      return {
        dishName: null,
        englishQuery: null,
        confidence: 'low',
        description: null,
        recipes: [],
        message: 'Could not identify a dish in this image. Try with a clearer photo.',
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
        searchResult = await this.spoonacular.searchRecipes({ query: stripped, number: 12 });
      }
    }

    // Fallback 2: try just the core term (last 2 words)
    if (!searchResult?.results?.length && result.englishQuery) {
      const words = result.englishQuery.split(' ');
      if (words.length > 2) {
        const core = words.slice(-2).join(' ');
        searchResult = await this.spoonacular.searchRecipes({ query: core, number: 12 });
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
}
