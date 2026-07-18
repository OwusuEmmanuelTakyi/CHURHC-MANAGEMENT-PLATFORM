function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-9 h-9 text-sm',
} as const;

export function Avatar({ name, size = 'md', tone = 'primary' }: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  tone?: 'primary' | 'sidebar';
}) {
  const toneClass = tone === 'sidebar'
    ? 'bg-sidebar-accent text-sidebar-foreground'
    : 'bg-primary/10 text-primary';

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${SIZE_CLASSES[size]} ${toneClass}`}>
      {initialsOf(name)}
    </span>
  );
}
