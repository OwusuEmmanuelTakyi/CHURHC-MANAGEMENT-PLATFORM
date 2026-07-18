import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { positionCreateSchema } from '@/lib/schemas';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

interface RawAssignment {
  id: number;
  member_id: number;
  start_date: string;
  end_date: string | null;
  academic_year: string;
  members: { full_name: string } | null;
}

export async function GET(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president', 'secretary');

    const url = new URL(req.url);
    const academicYear = url.searchParams.get('academic_year') ?? currentAcademicYear();

    let q = db.from('leadership_positions')
      .select(`
        id, title, scope, local_id, wing_id,
        leadership_assignments(id, member_id, start_date, end_date, academic_year, members(full_name))
      `)
      .order('title');
    q = ctx.role === 'national_president' ? q.eq('scope', 'national') : q.eq('local_id', ctx.localId);

    const [{ data: rawPositions, error }, { data: wings }] = await Promise.all([
      q,
      db.from('wings').select('id, name').eq('local_id', ctx.localId ?? -1),
    ]);
    if (error) throw new ApiError(500, error.message);

    const wingMap = new Map((wings ?? []).map((w) => [w.id, w.name]));
    const yearSet = new Set<string>([currentAcademicYear()]);

    const positions = (rawPositions ?? []).map((p) => {
      const assignments = (p.leadership_assignments ?? []) as unknown as RawAssignment[];
      for (const a of assignments) yearSet.add(a.academic_year);

      const forYear = assignments
        .filter((a) => a.academic_year === academicYear)
        .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
      const current = forYear.find((a) => a.end_date === null) ?? forYear[0] ?? null;

      return {
        id: p.id, title: p.title, scope: p.scope, local_id: p.local_id,
        wing_id: p.wing_id, wing_name: p.wing_id ? (wingMap.get(p.wing_id) ?? null) : null,
        assignment: current ? {
          id: current.id, member_id: current.member_id,
          member_name: current.members?.full_name ?? '(removed member)',
          start_date: current.start_date, end_date: current.end_date,
        } : null,
      };
    });

    return NextResponse.json({
      positions,
      academicYear,
      availableYears: Array.from(yearSet).sort().reverse(),
    });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');

    const body = positionCreateSchema.parse(await req.json());

    let scope: 'national' | 'local' | 'wing';
    let local_id: number | null;
    let wing_id: number | null = null;

    if (ctx.role === 'national_president') {
      if (body.scope !== 'national') throw new ApiError(403, 'National presidents can only create national positions');
      scope = 'national';
      local_id = null;
    } else {
      if (body.scope === 'national') throw new ApiError(403, 'Local presidents cannot create national positions');
      scope = body.scope;
      local_id = ctx.localId;
      if (scope === 'wing') {
        if (!body.wing_id) throw new ApiError(422, 'A wing is required for a wing-scoped position');
        const { data: wing } = await db.from('wings').select('id').eq('id', body.wing_id).eq('local_id', ctx.localId).single();
        if (!wing) throw new ApiError(404, 'Wing not found in your local');
        wing_id = body.wing_id;
      }
    }

    const { data, error } = await db.from('leadership_positions')
      .insert({ title: body.title, scope, local_id, wing_id }).select('id').single();
    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'A position with this title already exists in this scope');
      throw new ApiError(500, error.message);
    }

    await audit(ctx, 'leadership.position_created', 'leadership_position', data.id, { title: body.title, scope });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
