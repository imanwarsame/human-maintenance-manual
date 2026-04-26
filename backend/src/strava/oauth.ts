import { Router } from 'express';
import { upsertPlanContext, getPlanContext } from '../db/queries/planContext.js';

const router = Router();

interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
}

export async function getValidStravaToken(): Promise<string> {
  const tokens = (await getPlanContext('strava_tokens')) as StravaTokens | null;
  if (!tokens) throw new Error('Strava not connected. Visit /strava/connect to authorise.');

  // Refresh if expiring within 5 minutes
  if (Date.now() / 1000 >= tokens.expires_at - 300) {
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    if (!resp.ok) throw new Error(`Strava token refresh failed: ${resp.statusText}`);
    const fresh = (await resp.json()) as StravaTokens;
    await upsertPlanContext('strava_tokens', fresh);
    return fresh.access_token;
  }

  return tokens.access_token;
}

router.get('/connect', (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL ?? 'http://localhost:3000'}/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    res.status(400).send(`Strava auth error: ${error ?? 'no code'}`);
    return;
  }
  try {
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) throw new Error(`Strava token exchange failed: ${resp.statusText}`);
    const tokens = await resp.json();
    await upsertPlanContext('strava_tokens', tokens);
    res.send('Strava connected successfully. You can close this tab.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to connect Strava.');
  }
});

export default router;
