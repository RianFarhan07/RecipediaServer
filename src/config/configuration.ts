export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10) || 3001,
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  },
  spoonacular: {
    apiKey: process.env.SPOONACULAR_API_KEY ?? '',
    baseUrl: 'https://api.spoonacular.com',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  syncExpiryDays: 7,
});
