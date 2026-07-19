'use client';
import { useState } from 'react';

// Looks for public/branding/logo.png — drop a file there and it shows up
// everywhere this is used. Until then (or if it 404s), this renders nothing
// rather than a broken-image icon; the "GHAMSU Manager" text label next to
// it in every usage site carries the brand on its own regardless.
export function Logo({ size = 28 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-managed static asset with unknown dimensions ahead of time
    <img
      src="/branding/logo.png"
      alt="GHAMSU"
      width={size}
      height={size}
      className="rounded-md object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}
