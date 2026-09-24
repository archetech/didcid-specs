// Requires a built Archon checkout; uses in-memory storage only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const archon = resolve(process.argv[2] || '../archon');
const load = path => import(pathToFileURL(resolve(archon, path)));
const { default: Gatekeeper } = await load('packages/gatekeeper/dist/esm/node.js');
const { default: Db } = await load('packages/gatekeeper/dist/esm/db/json-memory.js');
const { default: IPFS } = await load('packages/ipfs/dist/esm/memory-client.js');
const { generateCID } = await load('packages/ipfs/dist/esm/utils.js');
const read = name => readFileSync(new URL(`../../markdown/${name}.md`, import.meta.url), 'utf8');
const json = name => [...read(name).matchAll(/```json\n([\s\S]*?)\n```/g)].map(match => JSON.parse(match[1]));
const [agent, asset] = json('creation');
const [rotation] = json('update');
const [deletion, deletedResult] = json('revocation');
const g = new Gatekeeper({ db: new Db('spec-examples'), ipfs: new IPFS() });
const agentDid = await g.createDID(agent);
const assetDid = await g.createDID(asset);
assert.equal(agentDid, `did:cid:${await generateCID(agent, { canonical: true })}`);
assert.equal(assetDid, `did:cid:${await generateCID(asset, { canonical: true })}`);
assert(read('creation').includes(`\`${agentDid}\``));
assert(read('creation').includes(`\`${assetDid}\``));
assert.equal(asset.controller, agentDid);
assert.equal(rotation.did, agentDid);
assert.equal(rotation.previd, agentDid.split(':').at(-1));
assert.equal(await g.updateDID(rotation), true);
// Confirm through normal Hyperswarm ingress before selecting the rotated owner.
await g.importBatch([agent, asset, rotation].map(operation => ({
    registry: 'hyperswarm', time: operation.proof.created, ordinal: [0], operation,
})));
await g.processEvents();
assert.equal(deletion.did, assetDid);
assert.equal(deletion.previd, assetDid.split(':').at(-1));
assert.equal(await g.deleteDID(deletion), true);
await g.importBatch([{ registry: 'hyperswarm', time: deletion.proof.created, ordinal: [0], operation: deletion }]);
await g.processEvents();
const result = await g.resolveDID(assetDid, { confirm: true, verify: true });
assert.deepEqual(result.didDocument, deletedResult.didDocument);
for (const [key, value] of Object.entries(deletedResult.didDocumentMetadata)) {
    assert.deepEqual(result.didDocumentMetadata[key], value);
}
assert.equal(result.didDocumentMetadata.updated, undefined);
assert.equal(result.didDocumentMetadata.versionId, await generateCID(deletion, { canonical: true }));
console.log('All four signed operation examples and deletion result validated against Gatekeeper.');
