export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ActivitySource = 'strava' | 'garmin' | 'manual';
export type NoteType = 'daily' | 'weekly';

export interface HydrationLog {
  id: string;
  date: string;
  amount_ml: number;
  logged_at: string;
}

export interface HydrationSummary {
  total_ml: number;
  logs: HydrationLog[];
}

export interface MealCompletion {
  id: string;
  meal_plan_id: string;
  eaten_at: string;
}

export interface MealPlan {
  id: string;
  date: string;
  meal_type: MealType;
  meal_name: string;
  description: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  prep_notes: string | null;
  created_by: 'claude' | 'manual';
  created_at: string;
  completion: MealCompletion | null;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  completed?: boolean;
  skipped?: boolean;
}

export interface RunInterval {
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown';
  distance_km: number;
  pace_min_per_km: string;
  repeats?: number;
}

export interface RunPlan {
  total_distance_km: number;
  target_pace_min_per_km: string;
  intervals?: RunInterval[];
}

export interface Activity {
  id: string;
  date: string;
  type: string;
  source: ActivitySource;
  external_id: string | null;
  duration_mins: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  notes: string | null;
  is_planned: boolean;
  raw_json: {
    exercises?: Exercise[];
    run_plan?: RunPlan;
    average_speed?: number;        // m/s (Strava)
    average_cadence?: number;      // strides/min (Strava) — multiply by 2 for spm
    total_elevation_gain?: number; // metres (Strava)
    calories?: number;
    max_heartrate?: number;        // bpm (Strava)
    elapsed_time?: number;
    best_efforts?: { name: string; elapsed_time: number; distance: number }[];
  } | null;
}

export interface CoachingNote {
  id: string;
  date: string;
  note_type: NoteType;
  content: string;
  generated_at: string;
}

export interface TodaySummary {
  date: string;
  hydration: HydrationSummary;
  meals: MealPlan[];
  activities: Activity[];
}

export interface WeekSummary {
  from: string;
  to: string;
  hydrationLogs: HydrationLog[];
  meals: MealPlan[];
  activities: Activity[];
  coachingNotes: CoachingNote[];
}

export interface MacroDay {
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface MacroTargets {
  training: MacroDay;
  rest: MacroDay;
}
