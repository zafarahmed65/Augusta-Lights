import { config } from 'dotenv';

/**
 * Loads .env.local the way Next.js does, so CLI scripts and the app read the
 * same file. Plain `dotenv/config` only looks at `.env`, which silently leaves
 * FAL_KEY unset in scripts.
 */
config({ path: '.env.local' });
config({ path: '.env' });
