import type { CoachingNote } from '../types/index.ts';

interface Props {
  note: CoachingNote | null | undefined;
  loading: boolean;
}

export default function CoachingCard({ note, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-2.5 bg-gray-100 rounded w-full" />
        <div className="h-2.5 bg-gray-100 rounded w-5/6" />
        <div className="h-2.5 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  if (!note) {
    return (
      <p className="text-sm text-gray-400 italic">No coaching note for today yet.</p>
    );
  }

  return (
    <div className="pl-3 border-l-2 border-brand-500/30">
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
      <p className="text-xs text-gray-300 mt-2">
        {new Date(note.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
