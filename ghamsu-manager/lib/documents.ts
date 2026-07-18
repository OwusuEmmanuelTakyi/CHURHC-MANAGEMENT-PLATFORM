export const DOCUMENT_MIME_WHITELIST = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
] as const;

export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_TYPES = ['minutes', 'report', 'constitution', 'handover', 'other'] as const;

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
