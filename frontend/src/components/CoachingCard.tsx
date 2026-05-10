import type { CoachingNote } from '../types/index.ts';

interface Props {
  note: CoachingNote | null | undefined;
  loading: boolean;
}

export default function CoachingCard({ note, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2.5 animate-pulse">
        <div className="h-2 bg-white/[.05] rounded w-full" />
        <div className="h-2 bg-white/[.05] rounded w-5/6" />
        <div className="h-2 bg-white/[.05] rounded w-3/4" />
      </div>
    );
  }

  if (!note) {
    return (
      <p className="text-sm text-ink-tertiary italic">No coaching note for today yet.</p>
    );
  }

  return (
    <div className="pl-3 border-l-2 border-brand-500/40">
      <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">{note.content}</p>
      <p className="text-xs text-ink-muted mt-2 num">
        {new Date(note.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
