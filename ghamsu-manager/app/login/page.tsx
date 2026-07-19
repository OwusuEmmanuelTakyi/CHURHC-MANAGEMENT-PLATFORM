'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Logo } from '@/components/shared/logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true); setError('');
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) { setError(signInErr.message); setBusy(false); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow p-6 space-y-4">
        <h1 className="flex items-center justify-center gap-2 text-xl font-semibold text-center text-primary">
          <Logo size={32} />
          GHAMSU Manager
        </h1>

        <input className="w-full border border-border rounded-lg p-2 bg-input-background text-foreground" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border border-border rounded-lg p-2 bg-input-background text-foreground" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleSignIn} disabled={busy}
          className="w-full bg-primary text-white rounded-lg p-2 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}
