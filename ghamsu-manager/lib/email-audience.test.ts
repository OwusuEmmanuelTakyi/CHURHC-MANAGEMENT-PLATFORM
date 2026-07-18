import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAudience } from './email-audience';

// A minimal chainable Postgrest-query stand-in: every filter method records the
// call and returns itself, and `await`-ing it resolves via `.then()` to whatever
// the current test configured as `mockResult`.
let calls: unknown[][] = [];
let mockResult: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null };

function makeBuilder() {
  const builder: Record<string, unknown> = {};
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push([method, ...args]);
    return builder;
  };
  builder.select = chain('select');
  builder.is = chain('is');
  builder.eq = chain('eq');
  builder.in = chain('in');
  builder.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(mockResult).then(resolve, reject);
  return builder;
}

vi.mock('./supabase/server', () => ({
  db: { from: vi.fn(() => makeBuilder()) },
}));

beforeEach(() => {
  calls = [];
  mockResult = { data: [], error: null };
});

describe('resolveAudience', () => {
  it('always intersects with the sender scope for a non-national sender', async () => {
    mockResult = { data: [{ id: 1, email: 'a@x.com' }], error: null };
    await resolveAudience({ national: false, localId: 5 }, { type: 'all', ids: [] });
    expect(calls).toContainEqual(['eq', 'local_id', 5]);
  });

  it('ignores caller-supplied local ids for a non-national sender — scope always wins', async () => {
    await resolveAudience({ national: false, localId: 5 }, { type: 'local', ids: [999] });
    expect(calls.find((c) => c[0] === 'in' && c[1] === 'local_id')).toBeUndefined();
    expect(calls).toContainEqual(['eq', 'local_id', 5]);
  });

  it('applies in(local_id, ids) for a national sender targeting specific locals', async () => {
    await resolveAudience({ national: true, localId: null }, { type: 'local', ids: [1, 2] });
    expect(calls).toContainEqual(['in', 'local_id', [1, 2]]);
    expect(calls.find((c) => c[0] === 'eq' && c[1] === 'local_id')).toBeUndefined();
  });

  it('does not scope-restrict a national sender targeting "all" with no ids', async () => {
    await resolveAudience({ national: true, localId: null }, { type: 'all', ids: [] });
    expect(calls.find((c) => c[0] === 'eq' && c[1] === 'local_id')).toBeUndefined();
    expect(calls.find((c) => c[0] === 'in' && c[1] === 'local_id')).toBeUndefined();
  });

  it('splits out members with no email as skipped, not recipients', async () => {
    mockResult = {
      data: [
        { id: 1, email: 'has@email.com' },
        { id: 2, email: null },
      ],
      error: null,
    };
    const result = await resolveAudience({ national: true, localId: null }, { type: 'all', ids: [] });
    expect(result.recipients).toEqual([{ member_id: 1, email: 'has@email.com' }]);
    expect(result.skippedCount).toBe(1);
  });

  it('dedupes members even if the same id appears twice in the raw rows', async () => {
    mockResult = {
      data: [
        { id: 1, email: 'a@x.com' },
        { id: 1, email: 'a@x.com' },
      ],
      error: null,
    };
    const result = await resolveAudience({ national: true, localId: null }, { type: 'all', ids: [] });
    expect(result.recipients).toHaveLength(1);
  });

  it('throws when the underlying query errors', async () => {
    mockResult = { data: null, error: { message: 'boom' } };
    await expect(
      resolveAudience({ national: true, localId: null }, { type: 'all', ids: [] }),
    ).rejects.toThrow('boom');
  });
});
