import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getProfileWithStats, getPublicProfile } from '../profile-service'

// Records which relation each query reads. Anonymous clients lose SELECT on
// `profiles` (20261107000001_arcanea_p0_security.sql), so public reads must use
// the allowlisted `public_profiles` view or signed-out profile pages 404.
function recordingClient(row: Record<string, unknown> | null) {
  const relations: string[] = []
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    single: async () => ({ data: row, error: row ? null : { message: 'not found' } }),
    then: (resolve: (value: unknown) => void) => resolve({ data: [], count: 0, error: null }),
  }
  const client = {
    from: (relation: string) => {
      relations.push(relation)
      return query
    },
  }
  return { client: client as unknown as SupabaseClient, relations }
}

const ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Lyra',
  avatar_url: null,
  bio: 'Worldsmith',
  magic_rank: 'Mage',
  gates_open: 3,
  xp: 40,
  level: 2,
  streak_days: 1,
  created_at: '2026-01-01T00:00:00Z',
}

test('getPublicProfile reads the public view, never the profiles table', async () => {
  const { client, relations } = recordingClient(ROW)
  const profile = await getPublicProfile(client, ROW.id)
  assert.deepEqual(relations, ['public_profiles'])
  assert.equal(profile?.displayName, 'Lyra')
  assert.equal(profile?.gatesOpen, 3)
})

test('getPublicProfile returns null when the view has no row', async () => {
  const { client } = recordingClient(null)
  assert.equal(await getPublicProfile(client, ROW.id), null)
})

test('getProfileWithStats serves the public API through the view', async () => {
  const { client, relations } = recordingClient(ROW)
  await getProfileWithStats(client, ROW.id)
  assert.equal(relations[0], 'public_profiles')
  assert.equal(relations.includes('profiles'), false)
})
