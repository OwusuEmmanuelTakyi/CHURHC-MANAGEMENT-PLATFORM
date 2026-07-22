import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { ApiError, handleApiError } from '@/lib/rbac';
import { checkInSubmitSchema } from '@/lib/schemas';
import { ATTENDANCE_ELIGIBLE_STATUSES, checkAndIncrementAttendanceIpLimit } from '@/lib/attendance';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  sunday_service: 'Sunday service',
  midweek: 'Midweek',
  special: 'Special',
};

async function loadValidLink(token: string) {
  const { data: link } = await db.from('attendance_links')
    .select('token, service_id, active, expires_at, created_by').eq('token', token).single();
  if (!link || !link.active || (link.expires_at && new Date(link.expires_at) < new Date())) {
    throw new ApiError(404, 'This check-in link is no longer available.');
  }
  const { data: service } = await db.from('services')
    .select('id, local_id, service_date, service_type, title, created_by').eq('id', link.service_id).single();
  if (!service) throw new ApiError(404, 'This check-in link is no longer available.');
  return { link, service };
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { service } = await loadValidLink(token);

    const { data: local } = await db.from('locals').select('name').eq('id', service.local_id).single();

    const typeLabel = SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type;
    const serviceLabel = service.title ? `${service.title} — ${typeLabel}, ${service.service_date}` : `${typeLabel}, ${service.service_date}`;

    return NextResponse.json({ localName: local?.name ?? '', serviceLabel });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    const allowed = await checkAndIncrementAttendanceIpLimit(ip);
    if (!allowed) throw new ApiError(429, 'Too many attempts from this connection — please try again later.');

    const { link, service } = await loadValidLink(token);
    const body = checkInSubmitSchema.parse(await req.json());

    const { data: member } = await db.from('members')
      .select('id, full_name')
      .eq('local_id', service.local_id)
      .is('deleted_at', null)
      .in('status', ATTENDANCE_ELIGIBLE_STATUSES)
      .ilike('student_id', body.student_id)
      .maybeSingle();
    if (!member) throw new ApiError(404, "We couldn't find that student ID. Double-check it, or see an executive at the door.");

    const { error } = await db.from('attendance_records').insert({
      service_id: service.id, member_id: member.id, recorded_by: link.created_by,
    });
    const alreadyMarked = Boolean(error && error.code === '23505');
    if (error && !alreadyMarked) throw new ApiError(500, error.message);

    return NextResponse.json({ ok: true, fullName: member.full_name, alreadyMarked });
  } catch (e) { return handleApiError(e); }
}
