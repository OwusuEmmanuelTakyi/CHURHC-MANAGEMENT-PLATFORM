// No server-only imports here — this file is shared with the public client
// form component, unlike lib/registration.ts which pulls in the service-role db.

// A field bots tend to autofill but a real visitor never sees or touches —
// hidden off-screen (not display:none) in the public form's CSS.
export const HONEYPOT_FIELD_NAME = 'company_website';
