import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { getScopedContext, requireRole, handleApiError, ApiError } from '@/lib/rbac';
import { executiveCreateSchema } from '@/lib/schemas';
import { normalizeGhPhone } from '@/lib/phone';
import { generateTempPassword } from '@/lib/executives';
import { currentAcademicYear } from '@/lib/academic-year';
import { audit } from '@/lib/audit';

export async function GET() {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');

    // Both active and deactivated accounts are returned — deactivating someone
    // shouldn't make them disappear from the list, just show as inactive.
    let q = db.from('role_assignments')
      .select('id, user_id, role_type, local_id, academic_year, active, executives(name, phone), locals(name, short_code)')
      .order('active', { ascending: false })
      .order('id', { ascending: false });
    if (ctx.role === 'local_president') q = q.eq('local_id', ctx.localId);

    const { data, error } = await q;
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ executives: data });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await getScopedContext();
    requireRole(ctx, 'national_president', 'local_president');

    const body = executiveCreateSchema.parse(await req.json());

    if (ctx.role === 'local_president') {
      if (body.role_type !== 'treasurer' && body.role_type !== 'secretary') {
        throw new ApiError(403, 'Local presidents can only create treasurer or secretary accounts');
      }
      if (body.local_id !== ctx.localId) {
        throw new ApiError(403, 'You can only create accounts for your own local');
      }
    } else {
      if (body.role_type === 'national_president' && body.local_id) {
        throw new ApiError(422, 'A national president must not have a local');
      }
      if (body.role_type !== 'national_president' && !body.local_id) {
        throw new ApiError(422, 'A local is required for this role');
      }
    }

    const phone = normalizeGhPhone(body.phone);
    if (!phone) throw new ApiError(422, 'Invalid Ghanaian phone number');

    const tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: body.email, password: tempPassword, email_confirm: true,
    });
    if (createErr || !created.user) throw new ApiError(500, createErr?.message ?? 'Could not create the account');
    const newUserId = created.user.id;

    const { error: execErr } = await db.from('executives').insert({ id: newUserId, name: body.name, phone });
    if (execErr) {
      await db.auth.admin.deleteUser(newUserId);
      if (execErr.code === '23505') throw new ApiError(409, 'An executive with this phone number already exists');
      throw new ApiError(500, execErr.message);
    }

    const localId = body.role_type === 'national_president' ? null : body.local_id;
    const { error: roleErr } = await db.from('role_assignments').insert({
      user_id: newUserId, role_type: body.role_type, local_id: localId,
      academic_year: currentAcademicYear(), active: true,
    });
    if (roleErr) {
      await db.auth.admin.deleteUser(newUserId); // cascades to the executives row too
      throw new ApiError(500, roleErr.message);
    }

    await audit(ctx, 'executive.created', 'executive', newUserId, { role_type: body.role_type, local_id: localId });

    return NextResponse.json({ id: newUserId, email: body.email, tempPassword }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
