import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { ApiError, handleApiError } from '@/lib/rbac';
import { publicRegistrationSchema } from '@/lib/schemas';
import { normalizeGhPhone } from '@/lib/phone';
import { checkAndIncrementIpLimit } from '@/lib/registration';
import { HONEYPOT_FIELD_NAME } from '@/lib/registration-shared';

async function loadValidLink(token: string) {
  const { data: link } = await db.from('registration_links')
    .select('token, local_id, active, expires_at').eq('token', token).single();
  if (!link || !link.active || (link.expires_at && new Date(link.expires_at) < new Date())) {
    throw new ApiError(404, 'This registration link is no longer available.');
  }
  return link;
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const link = await loadValidLink(token);

    const [{ data: local }, { data: wings }, { data: classes }] = await Promise.all([
      db.from('locals').select('name').eq('id', link.local_id).single(),
      db.from('wings').select('id, name').eq('local_id', link.local_id).order('name'),
      db.from('classes').select('id, name').eq('local_id', link.local_id).order('name'),
    ]);

    return NextResponse.json({ localName: local?.name ?? '', wings: wings ?? [], classes: classes ?? [] });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const raw = await req.json();

    // Honeypot: bots fill hidden fields, real visitors never see this one.
    // Pretend success and touch nothing, so scrapers don't learn to route around it.
    const honeypotValue = raw[HONEYPOT_FIELD_NAME];
    if (typeof honeypotValue === 'string' && honeypotValue.trim() !== '') {
      return NextResponse.json({ ok: true });
    }

    const allowed = await checkAndIncrementIpLimit(ip);
    if (!allowed) throw new ApiError(429, 'Too many submissions — please try again later.');

    const link = await loadValidLink(token);
    const body = publicRegistrationSchema.parse(raw);

    const phone = normalizeGhPhone(body.phone);
    if (!phone) throw new ApiError(422, "That doesn't look like a valid Ghanaian phone number.");

    if (body.wing_id) {
      const { data: wing } = await db.from('wings').select('id').eq('id', body.wing_id).eq('local_id', link.local_id).single();
      if (!wing) throw new ApiError(422, 'Invalid wing selection');
    }
    if (body.class_id) {
      const { data: klass } = await db.from('classes').select('id').eq('id', body.class_id).eq('local_id', link.local_id).single();
      if (!klass) throw new ApiError(422, 'Invalid class selection');
    }

    const { data: existingMember } = await db.from('members')
      .select('id').eq('local_id', link.local_id).eq('phone', phone).is('deleted_at', null).maybeSingle();

    const { error } = await db.from('member_registrations').insert({
      link_token: token,
      local_id: link.local_id,
      full_name: body.full_name,
      gender: body.gender,
      phone,
      email: body.email ?? null,
      student_id: body.student_id,
      hall_of_residence: body.hall_of_residence ?? null,
      wing_id: body.wing_id ?? null,
      class_id: body.class_id ?? null,
      level: body.level,
      expected_graduation: body.expected_graduation ?? null,
      date_of_birth: body.date_of_birth ?? null,
      matched_member_id: existingMember?.id ?? null,
      submitted_ip: ip,
    });
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
