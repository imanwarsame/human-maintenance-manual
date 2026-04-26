import { supabase } from '../supabase.js';

export type NoteType = 'daily' | 'weekly';

export interface CoachingNote {
  id: string;
  date: string;
  note_type: NoteType;
  content: string;
  generated_at: string;
}

export async function writeCoachingNote(date: string, note_type: NoteType, content: string): Promise<CoachingNote> {
  const { data, error } = await supabase
    .from('coaching_notes')
    .insert({ date, note_type, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCoachingNoteForDate(date: string, note_type?: NoteType): Promise<CoachingNote | null> {
  let query = supabase
    .from('coaching_notes')
    .select('*')
    .eq('date', date)
    .order('generated_at', { ascending: false })
    .limit(1);

  if (note_type) query = query.eq('note_type', note_type);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCoachingNotesForDateRange(from: string, to: string): Promise<CoachingNote[]> {
  const { data, error } = await supabase
    .from('coaching_notes')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
