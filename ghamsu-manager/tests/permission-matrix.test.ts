import { describe, it, expect, vi } from 'vitest';
import type { Ctx } from '@/lib/rbac';

// requireRole/ApiError/handleApiError stay real — only the session lookup
// (which needs a live Supabase session) is swapped out per test.
const getScopedContext = vi.fn<() => Promise<Ctx>>();
vi.mock('@/lib/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rbac')>();
  return { ...actual, getScopedContext };
});

function ctxFor(role: Ctx['role'], localId: number | null): Ctx {
  return { userId: 'test-user', role, localId, assignmentId: 1 };
}

async function expect403(promise: Promise<Response>) {
  const res = await promise;
  expect(res.status).toBe(403);
}

describe('permission matrix — "no" cells return 403', () => {
  it('Edit members: national_president = no', async () => {
    const { PATCH } = await import('@/app/api/members/[id]/route');
    getScopedContext.mockResolvedValue(ctxFor('national_president', null));
    await expect403(PATCH(
      new Request('http://test/api/members/1', { method: 'PATCH', body: '{}' }),
      { params: Promise.resolve({ id: '1' }) },
    ));
  });

  it('Import members: national_president = no', async () => {
    const { POST } = await import('@/app/api/members/import/route');
    getScopedContext.mockResolvedValue(ctxFor('national_president', null));
    await expect403(POST(new Request('http://test/api/members/import', { method: 'POST' })));
  });

  it('Leadership admin: treasurer = no', async () => {
    const { POST } = await import('@/app/api/leadership/positions/route');
    getScopedContext.mockResolvedValue(ctxFor('treasurer', 1));
    await expect403(POST(new Request('http://test/api/leadership/positions', { method: 'POST', body: '{}' })));
  });

  it('Leadership admin: secretary = no', async () => {
    const { POST } = await import('@/app/api/leadership/positions/route');
    getScopedContext.mockResolvedValue(ctxFor('secretary', 1));
    await expect403(POST(new Request('http://test/api/leadership/positions', { method: 'POST', body: '{}' })));
  });

  it('Send email: treasurer = no', async () => {
    const { POST } = await import('@/app/api/email/blasts/[id]/send/route');
    getScopedContext.mockResolvedValue(ctxFor('treasurer', 1));
    await expect403(POST(
      new Request('http://test/api/email/blasts/1/send', { method: 'POST' }),
      { params: Promise.resolve({ id: '1' }) },
    ));
  });

  it('Approve email drafts: national_president = no', async () => {
    const { POST } = await import('@/app/api/email/blasts/[id]/approve/route');
    getScopedContext.mockResolvedValue(ctxFor('national_president', null));
    await expect403(POST(
      new Request('http://test/api/email/blasts/1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '1' }) },
    ));
  });

  it('Approve email drafts: treasurer = no', async () => {
    const { POST } = await import('@/app/api/email/blasts/[id]/approve/route');
    getScopedContext.mockResolvedValue(ctxFor('treasurer', 1));
    await expect403(POST(
      new Request('http://test/api/email/blasts/1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '1' }) },
    ));
  });

  it('Approve email drafts: secretary = no', async () => {
    const { POST } = await import('@/app/api/email/blasts/[id]/approve/route');
    getScopedContext.mockResolvedValue(ctxFor('secretary', 1));
    await expect403(POST(
      new Request('http://test/api/email/blasts/1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: '1' }) },
    ));
  });

  it('Contributions: secretary = no', async () => {
    const { GET } = await import('@/app/api/contributions/route');
    getScopedContext.mockResolvedValue(ctxFor('secretary', 1));
    await expect403(GET(new Request('http://test/api/contributions')));
  });

  it('Documents: treasurer = no', async () => {
    const { GET } = await import('@/app/api/documents/route');
    getScopedContext.mockResolvedValue(ctxFor('treasurer', 1));
    await expect403(GET(new Request('http://test/api/documents')));
  });
});
