import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  logIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  resolveIncident,
  deleteIncident,
  addIncidentUpdate,
  getIncidentUpdates,
} from '../../db/queries/healthIncidents.js';

export function registerHealthIncidentTools(server: McpServer): void {
  server.tool(
    'log_incident',
    'Log a new illness or injury incident. Use this whenever the user reports getting sick or hurt, so it can inform coaching, meal, and workout plans.',
    {
      type: z.enum(['illness', 'injury']).describe('Whether this is an illness or an injury'),
      name: z.string().describe('Short name, e.g. "flu" or "sprained ankle"'),
      body_part: z.string().optional().describe('Affected body part (mainly for injuries)'),
      severity: z.enum(['mild', 'moderate', 'severe']).optional(),
      status: z.enum(['active', 'recovering', 'resolved']).optional().describe('Defaults to active'),
      started_date: z.string().describe('Date symptoms/injury started, YYYY-MM-DD'),
      resolved_date: z.string().optional().describe('Date it resolved, if already known'),
      symptoms: z.string().optional().describe('Symptoms observed'),
      treatment: z.string().optional().describe('Treatment taken (medication, rest, physio, etc.)'),
      notes: z.string().optional().describe('Any other free-text notes'),
    },
    async (args) => {
      const incident = await logIncident(args);
      return { content: [{ type: 'text', text: JSON.stringify(incident) }] };
    }
  );

  server.tool(
    'get_incidents',
    'Retrieve past and current illness/injury incidents. Use this to check history before planning workouts or meals, e.g. to avoid reinjuring a body part or overtraining while recovering.',
    {
      type: z.enum(['illness', 'injury']).optional(),
      status: z.enum(['active', 'recovering', 'resolved']).optional(),
      from: z.string().optional().describe('Start date YYYY-MM-DD (inclusive, filters on started_date)'),
      to: z.string().optional().describe('End date YYYY-MM-DD (inclusive, filters on started_date)'),
      limit: z.number().int().positive().optional().describe('Max incidents to return'),
    },
    async (args) => {
      const incidents = await getIncidents(args);
      return { content: [{ type: 'text', text: JSON.stringify(incidents) }] };
    }
  );

  server.tool(
    'get_incident',
    'Get a single incident by ID along with its logged progress updates.',
    {
      id: z.string().uuid().describe('Incident UUID'),
    },
    async ({ id }) => {
      const incident = await getIncidentById(id);
      const updates = incident ? await getIncidentUpdates(id) : [];
      return { content: [{ type: 'text', text: JSON.stringify({ incident, updates }) }] };
    }
  );

  server.tool(
    'update_incident',
    'Update fields on an existing illness/injury incident. Pass only the fields you want to change.',
    {
      id: z.string().uuid().describe('Incident UUID to update'),
      name: z.string().optional(),
      body_part: z.string().optional(),
      severity: z.enum(['mild', 'moderate', 'severe']).optional(),
      status: z.enum(['active', 'recovering', 'resolved']).optional(),
      started_date: z.string().optional(),
      resolved_date: z.string().optional(),
      symptoms: z.string().optional(),
      treatment: z.string().optional(),
      notes: z.string().optional(),
    },
    async ({ id, ...updates }) => {
      const incident = await updateIncident(id, updates);
      return { content: [{ type: 'text', text: JSON.stringify(incident) }] };
    }
  );

  server.tool(
    'resolve_incident',
    'Mark an incident as resolved, e.g. once an illness has passed or an injury has fully healed.',
    {
      id: z.string().uuid().describe('Incident UUID to resolve'),
      resolved_date: z.string().optional().describe('Date resolved (YYYY-MM-DD), defaults to today'),
    },
    async ({ id, resolved_date }) => {
      const incident = await resolveIncident(id, resolved_date);
      return { content: [{ type: 'text', text: JSON.stringify(incident) }] };
    }
  );

  server.tool(
    'delete_incident',
    'Delete an incident and its progress updates. Use only to remove an incorrectly logged entry.',
    {
      id: z.string().uuid().describe('Incident UUID to delete'),
    },
    async ({ id }) => {
      await deleteIncident(id);
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: id }) }] };
    }
  );

  server.tool(
    'add_incident_update',
    'Add a dated progress note to an existing incident, e.g. tracking recovery day by day.',
    {
      incident_id: z.string().uuid().describe('Incident UUID this update belongs to'),
      date: z.string().describe('Date of this update, YYYY-MM-DD'),
      note: z.string().describe('Progress note content'),
    },
    async ({ incident_id, date, note }) => {
      const update = await addIncidentUpdate(incident_id, date, note);
      return { content: [{ type: 'text', text: JSON.stringify(update) }] };
    }
  );
}
