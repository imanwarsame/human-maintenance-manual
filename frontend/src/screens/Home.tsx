import { useToday, useCoachingNote } from '../hooks/useToday.ts';
import CoachingCard from '../components/CoachingCard.tsx';
import SummaryBar from '../components/SummaryBar.tsx';

export default function Home() {
  const { data: today, isLoading: loadingToday } = useToday();
  const { data: note, isLoading: loadingNote } = useCoachingNote();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Good day, Iman</h1>
      <CoachingCard note={note} loading={loadingNote} />
      <SummaryBar data={today} loading={loadingToday} />
    </div>
  );
}
