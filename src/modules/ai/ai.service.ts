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

    // Kalkulasi per meal (3x makan sehari)
    const minCalories = Math.round((dailyCalories * 0.9) / 3);
    const maxCalories = Math.round((dailyCalories * 1.1) / 3);
    const minCarbs = Math.round((carbsGrams * 0.8) / 3);
    const maxCarbs = Math.round((carbsGrams * 1.2) / 3);
    const minProtein = Math.round((proteinGrams * 0.8) / 3);
    const maxProtein = Math.round((proteinGrams * 1.2) / 3);
    const minFat = Math.round((fatGrams * 0.8) / 3);
    const maxFat = Math.round((fatGrams * 1.2) / 3);

    const recipes = await this.spoonacular.searchByNutrients({
      minCalories,
      maxCalories,
      minCarbs,
      maxCarbs,
      minProtein,
      maxProtein,
      minFat,
      maxFat,
      number: 6,
      diet: diet ?? '',
      intolerances: allergiesStr,
      addRecipeInformation: true,
    });

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
  // 4. Analyze Image
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
