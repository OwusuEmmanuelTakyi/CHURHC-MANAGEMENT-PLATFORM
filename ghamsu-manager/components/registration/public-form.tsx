'use client';
import { useState } from 'react';
import { useSubmitPublicRegistration } from '@/lib/hooks/use-public-registration';
import { HONEYPOT_FIELD_NAME } from '@/lib/registration-shared';
import { ApiClientError } from '@/lib/api-client';
import type { PublicRegistrationFormData } from '@/lib/types';

const FIELD_CLASS = 'w-full border border-border rounded-lg px-3 py-2 text-base bg-input-background text-foreground';
const LEVELS = [100, 200, 300, 400, 500, 600];

export function PublicRegistrationForm({ token, data }: { token: string; data: PublicRegistrationFormData }) {
  const submit = useSubmitPublicRegistration(token);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const form = new FormData(e.currentTarget);
    const grad = String(form.get('expected_graduation') ?? '');

    const body = {
      full_name: String(form.get('full_name') ?? ''),
      gender: String(form.get('gender') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? '') || null,
      student_id: String(form.get('student_id') ?? ''),
      hall_of_residence: String(form.get('hall_of_residence') ?? '') || null,
      wing_id: form.get('wing_id') ? Number(form.get('wing_id')) : null,
      class_id: form.get('class_id') ? Number(form.get('class_id')) : null,
      level: Number(form.get('level')),
      expected_graduation: grad ? `${grad}-01` : null,
      date_of_birth: String(form.get('date_of_birth') ?? '') || null,
      [HONEYPOT_FIELD_NAME]: String(form.get(HONEYPOT_FIELD_NAME) ?? ''),
    };

    try {
      await submit.mutateAsync(body);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong — please try again.');
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-10">
        <h2 className="text-lg font-semibold text-foreground">Thanks for registering!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your details have been sent to {data.localName}&apos;s executives for review.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="text-sm flex flex-col gap-1 text-foreground">
        Full name
        <input name="full_name" className={FIELD_CLASS} required />
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Gender
        <select name="gender" className={FIELD_CLASS} required defaultValue="">
          <option value="" disabled>Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Phone number
        <input name="phone" type="tel" className={FIELD_CLASS} placeholder="0244123456" required />
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Email
        <input name="email" type="email" className={FIELD_CLASS} placeholder="you@example.com" />
        <span className="text-xs text-muted-foreground">
          Needed for announcements &amp; birthday wishes — strongly encouraged, not required.
        </span>
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Student ID
        <input name="student_id" className={FIELD_CLASS} required />
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Hall of residence
        <input name="hall_of_residence" className={FIELD_CLASS} />
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Level
        <select name="level" className={FIELD_CLASS} required defaultValue="">
          <option value="" disabled>Select…</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>

      {data.wings.length > 0 && (
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Wing
          <select name="wing_id" className={FIELD_CLASS} defaultValue="">
            <option value="">None</option>
            {data.wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
      )}

      {data.classes.length > 0 && (
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Class
          <select name="class_id" className={FIELD_CLASS} defaultValue="">
            <option value="">None</option>
            {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Expected graduation
        <input name="expected_graduation" type="month" className={FIELD_CLASS} />
      </label>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Date of birth
        <input name="date_of_birth" type="date" className={FIELD_CLASS} />
      </label>

      {/* Honeypot — hidden off-screen, not display:none, so simple bots that only check
          visibility still fill it in. Any real visitor never sees or touches this. */}
      <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor={HONEYPOT_FIELD_NAME}>Company website</label>
        <input id={HONEYPOT_FIELD_NAME} name={HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={submit.isPending}
        className="rounded-lg bg-primary text-white text-base font-medium py-2.5 disabled:opacity-50"
      >
        {submit.isPending ? 'Submitting…' : 'Submit registration'}
      </button>
    </form>
  );
}
