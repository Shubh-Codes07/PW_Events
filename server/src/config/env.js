import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .default('https://placeholder-project.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .default('placeholder-service-role-key'),
  GEMINI_API_KEY: z.string().optional().default('placeholder-gemini-key'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  throw new Error('Environment validation failed. Please check your server/.env file.');
}

export const env = parsed.data;
