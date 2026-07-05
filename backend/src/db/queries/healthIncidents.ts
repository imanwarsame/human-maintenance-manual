import { supabase } from '../supabase.js';

export type IncidentType = 'illness' | 'injury';
export type IncidentSeverity = 'mild' | 'moderate' | 'severe';
export type IncidentStatus = 'active' | 'recovering' | 'resolved';

export interface HealthIncident {
  id: string;
  type: IncidentType;
  name: string;
  body_part: string | null;
  severity: IncidentSeverity | null;
  status: IncidentStatus;
  started_date: string;
  resolved_date: string | null;
  symptoms: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHealthIncidentInput {
  type: IncidentType;
  name: string;
  body_part?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  started_date: string;
  resolved_date?: string;
  symptoms?: string;
  treatment?: string;
  notes?: string;
}

export interface HealthIncidentUpdate {
  id: string;
  incident_id: string;
  date: string;
  note: string;
  created_at: string;
}

export async function logIncident(input: CreateHealthIncidentInput): Promise<HealthIncident> {
  const { data, error } = await supabase
    .from('health_incidents')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getIncidents(filters: {
  type?: IncidentType;
  status?: IncidentStatus;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<HealthIncident[]> {
  let query = supabase
    .from('health_incidents')
    .select('*')
    .order('started_date', { ascending: false });

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('started_date', filters.from);
  if (filters.to) query = query.lte('started_date', filters.to);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getIncidentById(id: string): Promise<HealthIncident | null> {
  const { data, error } = await supabase
    .from('health_incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateIncident(
  id: string,
  updates: Partial<CreateHealthIncidentInput>
): Promise<HealthIncident> {
  const { data, error } = await supabase
    .from('health_incidents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveIncident(id: string, resolved_date?: string): Promise<HealthIncident> {
  return updateIncident(id, {
    status: 'resolved',
    resolved_date: resolved_date ?? new Date().toISOString().slice(0, 10),
  });
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await supabase.from('health_incidents').delete().eq('id', id);
  if (error) throw error;
}

export async function addIncidentUpdate(
  incident_id: string,
  date: string,
  note: string
): Promise<HealthIncidentUpdate> {
  const { data, error } = await supabase
    .from('health_incident_updates')
    .insert({ incident_id, date, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getIncidentUpdates(incident_id: string): Promise<HealthIncidentUpdate[]> {
  const { data, error } = await supabase
    .from('health_incident_updates')
    .select('*')
    .eq('incident_id', incident_id)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
