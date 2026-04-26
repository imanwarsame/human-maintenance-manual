import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeCoachingNote, getCoachingNoteForDate } from '../../db/queries/coaching.js';

export function registerCoachingTools(server: McpServer): void {
  server.tool(
    'get_coaching_note',
    "Return the coaching note for a given date (defaults to today). Returns null if none exists.",
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      note_type: z.enum(['daily', 'weekly']).optional(),
    },
    async ({ date, note_type }) => {
      const d = date ?? new Date().toISOString().slice(0, 10);
      const note = await getCoachingNoteForDate(d, note_type);
      return { content: [{ type: 'text', text: JSON.stringify(note) }] };
    }
  );

  server.tool(
    'write_coaching_note',
    'Write a coaching note for a given date. Used by Claude routines to deliver daily and weekly notes.',
    {
      date: z.string().describe('Date in YYYY-MM-DD format'),
      note_type: z.enum(['daily', 'weekly']),
      content: z.string().describe('The coaching note content (markdown supported)'),
    },
    async ({ date, note_type, content }) => {
      const note = await writeCoachingNote(date, note_type, content);
      return { content: [{ type: 'text', text: JSON.stringify(note) }] };
    }
  );
}
