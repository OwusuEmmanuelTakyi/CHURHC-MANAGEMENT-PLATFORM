'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Stage = 'password' | 'enroll' | 'challenge';

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handlePassword() {
    setBusy(true); setError('');
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) { setError(signInErr.message); setBusy(false); return; }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];

    if (totp) {
      setFactorId(totp.id);
      setStage('challenge');           // returning user → ask for the code
    } else {
      const { data, error: enrollErr } =
        await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrollErr) { setError(enrollErr.message); setBusy(false); return; }
      setFactorId(data.id);
      setQr(data.totp.qr_code);        // first login → show QR to scan
      setStage('enroll');
    }
    setBusy(false);
  }

  async function handleVerify() {
    setBusy(true); setError('');
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) { setError(chErr.message); setBusy(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId, challengeId: ch.id, code,
    });
    if (vErr) { setError('Invalid code — try again'); setBusy(false); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center text-primary">GHAMSU Manager</h1>

        {stage === 'password' && (
          <>
            <input className="w-full border border-border rounded-lg p-2 bg-input-background text-foreground" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)} />
            <input className="w-full border border-border rounded-lg p-2 bg-input-background text-foreground" type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handlePassword} disabled={busy}
              className="w-full bg-primary text-white rounded-lg p-2 disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </>
        )}

        {stage === 'enroll' && (
          <>
            <p className="text-sm text-muted-foreground">
              Scan this with Google Authenticator, then enter the 6-digit code.
            </p>
            <img src={qr} alt="TOTP QR code" className="mx-auto w-44 h-44" />
            <input className="w-full border border-border rounded-lg p-2 text-center tracking-widest bg-input-background text-foreground"
              placeholder="000000" maxLength={6}
              value={code} onChange={e => setCode(e.target.value)} />
            <button onClick={handleVerify} disabled={busy}
              className="w-full bg-primary text-white rounded-lg p-2 disabled:opacity-50">
              Verify & finish setup
            </button>
          </>
        )}

        {stage === 'challenge' && (
          <>
            <p className="text-sm text-muted-foreground">Enter the code from your authenticator app.</p>
            <input className="w-full border border-border rounded-lg p-2 text-center tracking-widest bg-input-background text-foreground"
              placeholder="000000" maxLength={6} autoFocus
              value={code} onChange={e => setCode(e.target.value)} />
            <button onClick={handleVerify} disabled={busy}
              className="w-full bg-primary text-white rounded-lg p-2 disabled:opacity-50">
              Verify
            </button>
          </>
        )}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}