'use client';
import { useState } from 'react';
import { useRecordContribution } from '@/lib/hooks/use-contributions';
import { MemberPicker } from '@/components/shared/member-picker';
import { ApiClientError } from '@/lib/api-client';

const FIELD_CLASS = 'border border-border rounded-lg px-2 py-1.5 text-sm bg-input-background text-foreground';

export function RecordPaymentForm({ onDone }: { onDone: () => void }) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'momo' | 'cash'>('momo');
  const [momoReference, setMomoReference] = useState('');
  const [semester, setSemester] = useState<'first' | 'second'>('first');
  const [receiptNote, setReceiptNote] = useState('');
  const [error, setError] = useState('');

  const record = useRecordContribution();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!memberId) { setError('Pick a member'); return; }
    const pesewas = Math.round(Number(amount) * 100);
    if (!pesewas || pesewas <= 0) { setError('Enter a valid amount'); return; }
    if (method === 'momo' && !momoReference.trim()) { setError('MoMo reference is required'); return; }

    try {
      await record.mutateAsync({
        member_id: memberId, amount_pesewas: pesewas, payment_method: method,
        momo_reference: method === 'momo' ? momoReference.trim() : null,
        receipt_note: receiptNote.trim() || null, semester,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground shrink-0">Member</span>
        <MemberPicker
          selectedName={memberName}
          onSelect={(id, name) => { setMemberId(id); setMemberName(name); }}
          onClear={() => { setMemberId(null); setMemberName(null); }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Amount (GHS)
          <input className={FIELD_CLASS} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Semester
          <select className={FIELD_CLASS} value={semester} onChange={(e) => setSemester(e.target.value as 'first' | 'second')}>
            <option value="first">First</option>
            <option value="second">Second</option>
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1 text-foreground">
          Method
          <select className={FIELD_CLASS} value={method} onChange={(e) => setMethod(e.target.value as 'momo' | 'cash')}>
            <option value="momo">MoMo</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        {method === 'momo' && (
          <label className="text-sm flex flex-col gap-1 text-foreground">
            MoMo reference
            <input className={FIELD_CLASS} value={momoReference} onChange={(e) => setMomoReference(e.target.value)} required />
          </label>
        )}
      </div>

      <label className="text-sm flex flex-col gap-1 text-foreground">
        Note (optional)
        <input className={FIELD_CLASS} value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={record.isPending} className="rounded-lg bg-primary text-white text-sm px-3 py-1.5 disabled:opacity-50">
          {record.isPending ? 'Recording…' : 'Record payment'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border text-foreground text-sm px-3 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
