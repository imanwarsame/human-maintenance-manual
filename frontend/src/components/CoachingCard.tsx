import type { CoachingNote } from '../types/index.ts';

interface Props {
  note: CoachingNote | null | undefined;
  loading: boolean;
}

export default function CoachingCard({ note, loading }: Props) {
  if (loading) {
    return <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />;
  }

  if (!note) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-400 text-center">
        No coaching note for today yet. Claude will write one this morning.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-500/20 shadow-sm p-5">
      <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">Today's note</p>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
      <p className="text-xs text-gray-400 mt-3">
        {new Date(note.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
