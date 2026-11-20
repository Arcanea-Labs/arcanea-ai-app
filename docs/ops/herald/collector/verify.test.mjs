import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('./artblocks-observations.n8n.json', import.meta.url)));
const nodes = Object.fromEntries(workflow.nodes.map(node => [node.name, node]));
const sample = {id:'0x0000000000000000000000000000000000000001-0',chain_id:1,
  name:'Fixture', activated_at:'2024-01-01T00:00:00Z', invocations:2, max_invocations:10};
const response = projects => JSON.stringify({data:{projects_metadata:projects}});
function validate(body) {
  return runInNewContext('(function(){' + nodes['Validate sample'].parameters.jsCode + '})()', {
    Buffer, $input: {first: () => ({json:{data:body}})}
  }, {timeout:1000});
}
test('preserves exact original bytes and assigns a six-hour UTC window', () => {
  const body = response([sample]) + '\n';
  const [{json,binary}] = validate(body);
  assert.equal(json.body, body);
  assert.equal(Buffer.from(binary.data.data, 'base64').toString(), body);
  assert.equal(Date.parse(json.slot) % 21600000, 0);
});
for (const [reason,body] of Object.entries({
  malformed:'<html>', oversized:' '.repeat(65537), missing:'{}', noProjects:response([]),
  partial:JSON.stringify({errors:[{}],data:{projects_metadata:[sample]}}),
  duplicate:response([sample,sample]), excessive:response(Array(21).fill(sample)),
  wrongChain:response([{...sample,chain_id:10}]), negative:response([{...sample,invocations:-1}]),
  overSupply:response([{...sample,invocations:11}]), unknownCapacity:response([{...sample,max_invocations:null}]),
  futureDate:response([{...sample,activated_at:'9999-01-01T00:00:00Z'}]),
  brokenId:response([{...sample,id:'other'}])
})) test('rejects ' + reason, () => assert.throws(() => validate(body)));
test('credential-free artifact binds the two triggers to one fixed-source path', () => {
  assert.equal(workflow.active,false);
  assert.ok(workflow.nodes.every(n => !n.credentials && !n.continueOnFail));
  assert.deepEqual(workflow.nodes.map(n => n.type.split('.').pop()),
    ['scheduleTrigger','manualTrigger','httpRequest','code','crypto','s3','postgres','postgres','code']);
  const downstream = name => workflow.connections[name].main[0][0].node;
  assert.equal(downstream('Manual canary'),downstream('Every six hours'));
  assert.equal(downstream('Archive response'),'Record observation');
  assert.equal(nodes['Read Art Blocks'].parameters.url,'https://data.artblocks.io/v1/graphql');
  assert.match(nodes['Record observation'].parameters.query,/ON CONFLICT \(platform, source_id\) DO NOTHING/);
});
const hash = 'a'.repeat(64);
function receipt(outcome, accepted, observed=hash) {
  const context = {
    $: name => ({first: () => ({json: name === 'Record observation' ?
      {outcome,new_id:'row-1'} : {sha:observed,slot:'slot'}})}),
    $input: {first: () => ({json:{accepted}})}, $execution:{id:123}
  };
  return runInNewContext('(function(){' + nodes['Verify receipt'].parameters.jsCode + '})()',context)[0].json;
}
test('distinguishes original evidence from a later capture in an occupied slot', () => {
  const accepted = {id:'row-1',sha:hash,run_ref:'n8n:1'};
  assert.equal(receipt('inserted',accepted).sameEvidence,true);
  assert.equal(receipt('slot_already_recorded',accepted,'b'.repeat(64)).sameEvidence,false);
  assert.equal(receipt('slot_already_recorded',accepted).originalRunRef,'n8n:1');
});
test('missing row, failed write and inserted readback mismatch stop the run', () => {
  assert.throws(()=>receipt('slot_already_recorded',null));
  assert.throws(()=>receipt('hash_mismatch',{id:'row-1',sha:hash}));
  assert.throws(()=>receipt('inserted',{id:'other',sha:hash}));
});
