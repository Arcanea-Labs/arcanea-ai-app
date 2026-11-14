import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { World, Record as WorldRecord } from '@arcanea/schemas/atlas-world';
import { validateWorld } from '@arcanea/world-engine/atlas-world';
import { z } from 'zod';

export const CreateWorld = z.object({ document: World, legacyWorldId: z.string().uuid().nullable().default(null) }).strict();
export const ProposeRecord = z.object({ record: WorldRecord, revision: z.number().int().positive() }).strict();
export const ReviewRecord = z.object({ proposalId: z.string().uuid(), contentHash: z.string().regex(/^[a-f0-9]{64}$/), revision: z.number().int().positive(), decision: z.enum(['approved','rejected']) }).strict();

/** Uses the existing cookie-authenticated client. No service-role key and no query-supplied role. */
export async function atlasRpc(name: string, args: { [key: string]: unknown }) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { data: null, error: { code: '42501', message: 'Sign in to work with private worlds' } };
  // New RPCs are introduced by this migration; generated database types update after deployment.
  const rpc = client.rpc.bind(client) as unknown as (name: string, args: { [key: string]: unknown }) => Promise<{ data: unknown; error: { code: string; message: string } | null }>;
  return rpc(name, args);
}
export function worldErrors(document: z.infer<typeof World>): string[] { return validateWorld(document); }
