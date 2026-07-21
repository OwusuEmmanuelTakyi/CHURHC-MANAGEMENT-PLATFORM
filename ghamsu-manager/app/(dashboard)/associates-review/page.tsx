'use client';
import Link from 'next/link';
import { useGraduationQueue } from '@/lib/hooks/use-graduation-queue';

export default function AssociatesReviewPage() {
  const { data, isLoading, error } = useGraduationQueue();

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-foreground mb-1">Associates review</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Active or executive members past their expected graduation date — review and move them to associate status.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && data.members.length === 0 && (
        <p className="text-sm text-muted-foreground">Nobody is overdue — nice.</p>
      )}

      {data && data.members.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Student ID</th>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Expected graduation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.members.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/members?q=${encodeURIComponent(m.full_name)}`} className="text-primary hover:underline">
                      {m.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{m.student_id}</td>
                  <td className="px-3 py-2 text-foreground">{m.level}</td>
                  <td className="px-3 py-2 text-muted-foreground capitalize">{m.status}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{m.expected_graduation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
