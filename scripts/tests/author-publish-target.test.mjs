import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const stubs = {
  'next/server': 'export class NextRequest {} export const NextResponse = {json: (body, init = {}) => ({body, status: init.status ?? 200})}',
  '@octokit/rest': 'export const Octokit = globalThis.__arcaneaTestOctokit',
  '@arcanea/publishing-house/quality/taste-gate': 'export const scoreTASTE = async () => ({passesGate:true})',
  '@/lib/supabase/server': 'export const createClient = async () => globalThis.__arcaneaTestSupabase',
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(stubs, specifier)) {
      return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

test('publishing targets the new owner by default and preserves an explicit owner override', async () => {
  const prior = { ...process.env };
  const calls = [];
  globalThis.__arcaneaTestOctokit = class {
    rest = { repos: {
      getContent: async (args) => { calls.push(['read', args]); return {data: {sha: 'existing'}}; },
      createOrUpdateFileContents: async (args) => { calls.push(['write', args]); return {data: {commit: {sha: 'committed'}}}; },
    }};
  };
  globalThis.__arcaneaTestSupabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'author' } } }) },
    from(table) {
      const result = table === 'books' ? {id: 'book'} : table === 'book_authors' ? {role:'author'} : [{chapter_slug:'chapter', content:'draft', word_count:1}];
      const query = {
        select() { return this; }, eq() { return this; }, delete() { return this; },
        in() { return Promise.resolve({}); }, maybeSingle() { return Promise.resolve({data: result}); },
        then(resolve) { return Promise.resolve({data: result}).then(resolve); },
      };
      return query;
    },
  };
  try {
    process.env.GITHUB_TOKEN = 'synthetic-test-token';
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_BRANCH;
    const route = pathToFileURL(resolve('apps/web/app/api/author/[bookSlug]/publish/route.ts')).href;
    for (const [suffix, override, expected] of [['default', undefined, 'Arcanea-Labs'], ['override', 'OtherOwner', 'OtherOwner']]) {
      if (override) process.env.GITHUB_OWNER = override;
      const { POST } = await import(route + '?' + suffix);
      const response = await POST({nextUrl: {searchParams: new URLSearchParams('gate=off')}}, {params: Promise.resolve({bookSlug:'book'})});
      assert.equal(response.status, 200);
      assert.equal(response.body.published, 1);
      assert.deepEqual(calls.splice(0).map(([kind, args]) => [kind, args.owner, args.repo, args.ref ?? args.branch]), [
        ['read', expected, 'arcanea-ai-app', 'main'],
        ['write', expected, 'arcanea-ai-app', 'main'],
      ]);
    }
  } finally {
    process.env = prior;
    delete globalThis.__arcaneaTestOctokit;
    delete globalThis.__arcaneaTestSupabase;
  }
});
