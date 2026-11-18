## DID URL Dereferencing

[[def: dereferencing, The process of returning a resource identified by a DID URL — for did:cid, a path resource or a node within the DID document — as distinct from resolution, which returns the DID document and its metadata]]

Dereferencing a `did:cid` DID URL returns a *resource* associated with the DID, as distinct from [[ref: resolution]] (which returns the DID document and its metadata). Because `did:cid` is [[ref: content-addressed identity, content-addressed]], these resources are retrieved by content rather than from an external location.

### Path Resources

This method defines two dereferenceable resources, selected by the DID URL path:

- **`/data`** — `did:cid:<cid>/data` dereferences to the DID's data resource: the bare [[ref: didDocumentData]] value. An [[ref: agent, Agent]] DID's data resource holds its agent-level `didDocumentData` (e.g. `manifest`, `backupStore` — see Known Uses under Archon Extensions), or `{}` if none has been set; [[ref: asset]] DIDs return their attached data. A revoked DID's data resource is empty.
- **`/registration`** — `did:cid:<cid>/registration` dereferences to the DID's registration/anchoring provenance: the [[ref: didDocumentRegistration]] object (registry, type, validity, version), **plus** the anchoring state `confirmed` and, where the registry anchors to a blockchain, `timestamp`. This is method-specific provenance, not [[ref: DID-CORE]] DID document metadata, which is why `confirmed` and `timestamp` are surfaced here rather than embedded in `didDocumentMetadata`.

```json
{
  "registry": "BTC:mainnet",
  "type": "agent",
  "version": 1,
  "confirmed": true,
  "timestamp": {
    "chain": "BTC:mainnet",
    "opid": "bagaaiera...",
    "lowerBound": { "time": 1768424000, "timeISO": "2026-01-14T19:33:20Z", "blockid": "0000...", "height": 878123 },
    "upperBound": { "time": 1768425200, "timeISO": "2026-01-14T19:53:20Z", "blockid": "0000...", "height": 878125, "txid": "…", "txidx": 3 }
  }
}
```

`timestamp` is present only when the DID's registry anchors to a blockchain and the anchoring block is known; registries such as `hyperswarm` return the registration fields and `confirmed` alone.

Neither resource is part of the DID resolution result. Both honor the `versionTime` and `versionSequence` version selectors, and both are returned as plain `application/json`.

::: note
These resources always reflect confirmed, cryptographically verified state.
:::

### Blockchain Timestamp Bounds

When the DID's registry anchors to a blockchain (Bitcoin, Ethereum, Zcash, Solana, Filecoin), the `timestamp` object in the `/registration` resource (shown above) provides cryptographic upper and lower bounds on when the most recent operation was submitted, derived directly from block data:

- **Lower bound** (`lowerBound`): Present when the operation included a `blockid` field at submission time, referencing a recent block. This proves the operation was created *after* that block was mined — establishing a cryptographic "not before" constraint.
- **Upper bound** (`upperBound`): Always present for confirmed blockchain operations. Identifies the block in which the operation batch was anchored, proving the operation existed *before* the subsequent block — establishing a "not after" constraint.

Together, the bounds define an independently verifiable time window without relying on self-asserted client timestamps. They can be verified by any party with access to the relevant blockchain, providing legal-grade timestamping for DID operations.

### Fragments

A fragment identifies a node within the DID document — for example `did:cid:<cid>#key-1` dereferences to the verification method whose `id` matches. Per the [[ref: DID-CORE]] processing model, the fragment is applied **client-side** to the resolved DID document (it is not transmitted to the resolver over HTTP); the node whose fully-qualified `id` matches the DID URL is returned.

### Service Dereferencing (Future)

The registered `service` and `relativeRef` query parameters — used to construct external service-endpoint URLs — are not currently implemented. If added they would be additive, and would change neither the resolution result nor the path resources above.
