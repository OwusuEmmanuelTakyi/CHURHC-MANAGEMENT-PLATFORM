import { ApiError } from './rbac';

// Basic in-memory fixed-window limiter. Good enough for a small internal tool,
// but note it resets per serverless instance — it's a speed bump, not a hard
// guarantee, on platforms like Vercel where instances aren't shared/durable.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  if (!checkRateLimit(key, limit, windowMs)) {
    throw new ApiError(429, 'Too many requests — try again shortly.');
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}
