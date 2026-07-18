import { z } from 'zod';
import { DOCUMENT_MIME_WHITELIST, DOCUMENT_TYPES, DOCUMENT_MAX_BYTES } from './documents';

export const memberCreateSchema = z.object({
  student_id: z.string().trim().min(1),
  full_name: z.string().trim().min(2),
  gender: z.enum(['male', 'female']),
  phone: z.string().min(9),                    // normalised separately
  email: z.email().nullish(),
  hall_of_residence: z.string().nullish(),
  local_id: z.number().int().positive(),
  wing_id: z.number().int().positive().nullish(),
  class_id: z.number().int().positive().nullish(),
  level: z.union([z.literal(100), z.literal(200), z.literal(300),
                  z.literal(400), z.literal(500), z.literal(600)]),
  status: z.enum(['prospective', 'active', 'executive', 'associate']).default('active'),
  expected_graduation: z.string().regex(/^\d{4}-\d{2}-01$/).nullish(), // 'YYYY-MM-01'
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export const memberUpdateSchema = memberCreateSchema.partial().omit({ local_id: true });
// local_id omitted: members never move locals via PATCH — that would be a transfer feature

export const localCreateSchema = z.object({
  name: z.string().trim().min(2),
  short_code: z.string().trim().min(2).max(10),
  university_name: z.string().trim().min(2),
});

export const localUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  university_name: z.string().trim().min(2).optional(),
  active: z.boolean().optional(),
});
// short_code omitted: it's the stable identifier other records key off of

export const wingClassSchema = z.object({
  name: z.string().trim().min(1),
});

export const positionCreateSchema = z.object({
  title: z.string().trim().min(2),
  scope: z.enum(['national', 'local', 'wing']),
  wing_id: z.number().int().positive().nullish(),
});

export const positionUpdateSchema = z.object({
  title: z.string().trim().min(2),
});

export const assignmentCreateSchema = z.object({
  position_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/).optional(),
});

export const handoverSchema = z.object({
  assignments: z.array(z.object({
    position_id: z.number().int().positive(),
    member_id: z.number().int().positive(),
  })).min(1),
});

export const audienceFilterSchema = z.object({
  type: z.enum(['all', 'local', 'wing', 'class', 'executives', 'specific_members']),
  ids: z.array(z.number().int().positive()).default([]),
});

export const blastCreateSchema = z.object({
  subject: z.string().trim().min(2),
  body: z.string().trim().min(2),
  audienceFilter: audienceFilterSchema,
  scheduledAt: z.iso.datetime().nullish(),
});

export const contributionCreateSchema = z.object({
  member_id: z.number().int().positive(),
  amount_pesewas: z.number().int().positive(),
  payment_method: z.enum(['momo', 'cash']),
  momo_reference: z.string().trim().min(1).nullish(),
  receipt_note: z.string().trim().nullish(),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/).optional(),
  semester: z.enum(['first', 'second']),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((data) => data.payment_method !== 'momo' || !!data.momo_reference, {
  message: 'A MoMo reference is required for MoMo payments',
  path: ['momo_reference'],
});

export const documentUploadUrlSchema = z.object({
  name: z.string().trim().min(1),
  mime_type: z.enum(DOCUMENT_MIME_WHITELIST),
  file_size_bytes: z.number().int().positive().max(DOCUMENT_MAX_BYTES),
});

export const documentCreateSchema = z.object({
  name: z.string().trim().min(1),
  document_type: z.enum(DOCUMENT_TYPES),
  academic_year: z.string().regex(/^\d{4}\/\d{4}$/).optional(),
  file_url: z.string().trim().min(1),
  file_size_bytes: z.number().int().positive().max(DOCUMENT_MAX_BYTES),
  mime_type: z.enum(DOCUMENT_MIME_WHITELIST),
});

export const serviceCreateSchema = z.object({
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  service_type: z.enum(['sunday_service', 'midweek', 'special']).default('sunday_service'),
  title: z.string().trim().nullish(),
});

export const attendanceToggleSchema = z.object({
  member_id: z.number().int().positive(),
  present: z.boolean(),
});

export const registrationLinkCreateSchema = z.object({
  expires_at: z.iso.datetime().nullish(),
});

// Mirrors memberCreateSchema (minus local_id/status, which the link and the
// approval step decide) plus date_of_birth. The honeypot field is read
// straight off the raw body, not through this schema — see lib/registration.ts.
export const publicRegistrationSchema = z.object({
  full_name: z.string().trim().min(2),
  gender: z.enum(['male', 'female']),
  phone: z.string().min(9),
  email: z.email().nullish(),
  student_id: z.string().trim().min(1),
  hall_of_residence: z.string().trim().nullish(),
  wing_id: z.number().int().positive().nullish(),
  class_id: z.number().int().positive().nullish(),
  level: z.union([z.literal(100), z.literal(200), z.literal(300),
                  z.literal(400), z.literal(500), z.literal(600)]),
  expected_graduation: z.string().regex(/^\d{4}-\d{2}-01$/).nullish(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export const registrationReviewSchema = z.object({
  mode: z.enum(['create', 'merge']).default('create'),
});

export const executiveCreateSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().min(9),
  email: z.email(),
  role_type: z.enum(['national_president', 'local_president', 'treasurer', 'secretary']),
  local_id: z.number().int().positive().nullish(),
});