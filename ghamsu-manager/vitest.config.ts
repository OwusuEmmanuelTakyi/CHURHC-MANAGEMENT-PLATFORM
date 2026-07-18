import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    // Route files construct the Supabase client at import time — these dummy
    // values just need to be well-formed enough not to throw; tests never
    // reach a real network call (requireRole rejects before any db access).
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      RESEND_API_KEY: 'test-resend-key',
      RESEND_WEBHOOK_SECRET: 'test-webhook-secret',
      EMAIL_FROM: 'test@example.com',
      CRON_SECRET: 'test-cron-secret',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
