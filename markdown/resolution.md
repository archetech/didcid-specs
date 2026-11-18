## DID Resolution

[[def: resolution, The process of returning the DID document and its metadata for a given DID — distinct from dereferencing, which returns a resource identified by a DID URL]]

Resolution is the operation of returning a DID Document and its metadata for a given DID. It is distinct from *dereferencing*, which returns a resource identified by a DID URL (see DID URL Dereferencing).

Given a DID and an optional resolution time, the resolver uses its locally retained operation history and [[ref: seed document]], ordinarily received through Hyperswarm gossip. When creation content is missing locally, it retrieves that content from IPFS using the DID suffix as the CID. Retrieved content is parsed and validated before use; the retrieval channel does not establish authorization.

### Resolution Options

The `did:cid` method supports the following resolution options per [[ref: DID-CORE]]:

| Option | Type | Description |
|--------|------|-------------|
| `versionTime` | RFC 3339 date-time | Resolve the DID document as it existed at or before this point in time |
| `versionSequence` | positive integer | Resolve at a specific operation sequence number (1-indexed from creation) |
| `versionId` | operation CID | Resolve at one operation, named by its canonical CID |

If no option is specified, the resolver returns the most recent confirmed version.

- **`versionTime`** is a date-time with a zone designator, `Z` or a numeric offset, such as `2026-11-18T11:30:00Z`. Fractional seconds are accepted, since `did:cid` timestamps carry them.
- **`versionSequence`** is a positive integer in decimal digits, no greater than 9007199254740991 (2^53 − 1), the largest integer RFC 7493 treats as exactly representable in JSON. `versionTime` and `versionSequence` may be given together, and both bounds apply.
- **`versionId`** selects the document as of one operation in the accepted history. The value is the operation's canonical CID, the value returned as `versionId` in document metadata; a retrieval alias the resolver retains for that operation selects the same version. `versionId` is not combined with either other option.

### Resolution Errors

An option that cannot be used is an error. A resolver MUST NOT answer it with the latest version.

| `didResolutionMetadata.error` | When | HTTP status on `/1.0/identifiers` |
|---|---|---|
| `invalidDid` | The DID is not a valid `did:cid` identifier. Reported before any error in the options | 400 |
| `invalidOptions` | `versionTime` is not a date-time in the form above; `versionSequence` is not a positive integer in the range above; `versionId` is empty; or `versionId` is given with `versionTime` or `versionSequence` | 400 |
| `notFound` | The DID is not known to the resolver; the DID's history does not verify; or `versionId` names no operation in the accepted history the resolution walks, because it is unknown, was displaced by a preferred sibling, or is not yet confirmed | 404 |

A `versionId` that is displaced or unconfirmed is `notFound` and not an earlier or later version: the option names one operation, and a resolver that cannot return that operation's version returns none.

A history that exists and does not verify is `notFound`, as a DID the resolver does not know is. A resolver returns a document only from a history it has verified, and the error does not tell the two cases apart.

A `versionTime` earlier than the DID's creation is not an error. A time bound never excludes a creation (see Protocol Rules), so the result is at least the creation version, and `created` in the document metadata shows that the document is later than the time asked for. Successors remain subject to the bound: one is included only if its own time is at or before `versionTime`.

---

### Resolution Algorithm

Resolution computes a predecessor-linked accepted history from available evidence under Protocol Rules. It MUST NOT select branches by receipt arrival order or merely sort all operations by time. Missing controller history can change authorization when it arrives.

Conceptually, a resolver:

1. Uses the locally retained content-addressed creation operation, falling back to IPFS if unavailable locally, and validates it.
2. Incorporates locally trusted registry evidence and unconfirmed hints, validating their targets and receipt shapes.
3. Reconstructs self-controlled agent histories, selecting valid competing successors; then revalidates asset histories against their agents. Deferred predecessors and changed authority are reconsidered until the accepted state settles.
4. Applies the requested version/time bound to the predecessor-linked history without skipping excluded predecessors. Hyperswarm and pin use intrinsic proof time; local creation uses operation `created` and local mutations use `proof.created`; chain receipts retain chain time and position.
5. For this specification's conformant HTTP surface, returns the confirmed, verified projection as the DID Core result, exposing data and registration separately by dereferencing.

A cached projection MUST be consistent with replay of the same retained evidence. Local registry support controls submission and queueing, not whether retained evidence can be resolved. The conformant HTTP surface does not delegate resolution to peers.

### Resolving from a Gatekeeper's Export

An implementation can resolve a DID without being a node, by reading one Gatekeeper's export of the DID's events (Archon's `POST /api/v1/dids/export`, which is outside this specification's conformant surface) and verifying the signed operations itself. Three things about an export follow from the rules above:

- **An export is an accepted history.** The exporting Gatekeeper has already selected among competing successors; the candidates it did not accept are retained separately and are not exported. A reader verifies the operations and their predecessor order and does not select again. An export that contains a sibling, an operation that does not verify, or operations out of predecessor order is not an accepted history, and the reader fails.
- **Its receipts are the exporting Gatekeeper's own record.** A chain receipt in an export is what that Gatekeeper's registry mediator reported. It is not signed and cannot be checked from the export. A reader that counts it as confirmation relies on that Gatekeeper, both for confirmation and for the chain positions that select controller history. A reader that cannot rely on it obtains chain evidence itself.
- **Batch membership is part of what a receipt asserts.** The mediator checks an anchored operation against the batch DID's genesis document before a receipt is recorded. A reader that relies on the exporting Gatekeeper's receipts relies on that check too and does not repeat it. A reader that obtains chain evidence itself has to make it: an anchor shows that a batch was committed at a position, not that an operation is in the batch. That reader retrieves the batch DID's genesis document and verifies that the operation's canonical CID is in `didDocumentData.batch.ops` at the index the receipt gives as `opidx`, as Protocol Rules requires of a mediator under Chain receipts and anchored batches.

### Resolution Result

A conformant resolution returns only the three members defined by the [[ref: DID-CORE]] DID Resolution data model:

- `didDocument`
- `didResolutionMetadata`
- `didDocumentMetadata`

The method-specific `didDocumentData` and `didDocumentRegistration` objects are **not** part of the resolution result; they are exposed as dereferenceable resources (see DID URL Dereferencing). Standard document metadata — `created`, `updated`, `deleted`, `deactivated`, `versionId`, `versionSequence`, `canonicalId` — is carried in `didDocumentMetadata`.

The method-specific `confirmed` and `timestamp` fields are **not** [[ref: DID-CORE]] document metadata, so they are not carried in `didDocumentMetadata`; they are anchoring provenance, returned with the registration resource at `/registration`.

`didResolutionMetadata` carries `contentType` — the media type of the returned representation.

```json
{
  "didDocument": { "id": "did:cid:<cid>", "...": "..." },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  },
  "didDocumentMetadata": {
    "created": "2026-01-14T19:32:24Z",
    "versionId": "bagaaiera...",
    "versionSequence": "1"
  }
}
```

### Representations

The resolver negotiates the DID document representation from the `Accept` request header, and echoes the selected media type in both the `Content-Type` response header and `didResolutionMetadata.contentType`:

| `Accept` | Representation |
|----------|----------------|
| `application/did+ld+json` (or absent) | JSON-LD — the default |
| `application/did+json` | Plain JSON |

Responses set `Vary: Accept`. This applies to the resolution result only; the `/data` and `/registration` resources are plain `application/json`.

### Endpoints

The resolution and dereferencing surface follows the [Universal Resolver](https://github.com/decentralized-identity/universal-resolver) driver convention:

| DID URL | HTTP | Returns |
|---------|------|---------|
| `did:cid:<cid>` | `GET /1.0/identifiers/<did>` | DID Resolution result (the triple) |
| `did:cid:<cid>/data` | `GET /1.0/identifiers/<did>/data` | The data resource |
| `did:cid:<cid>/registration` | `GET /1.0/identifiers/<did>/registration` | The registration resource |

This surface always returns confirmed, cryptographically verified state.

### Fallback and Forwarding

The conformant `/1.0/identifiers` surface resolves from the node's available state and content retrieval; it MUST NOT delegate resolution to a universal-resolver fallback or a confirmed-Gatekeeper peer. If it cannot resolve the DID, it returns the appropriate resolution error. An unsupported local registry alone does not require delegation or prevent resolution of retained evidence.

Archon's separate `/api/v1/did/:did` endpoint has configurable HTTP fallback behavior. Confirmed-peer fallback applies when confirmed resolution is requested and local history is missing, or the unconfirmed view extends beyond the confirmed prefix under the same bounds. Eligible peer results must match the DID, respect those bounds, and advance existing confirmed state. This proxy behavior does not import events or change core resolution semantics. It is not a required forwarding chain for the DID method.

### Ordinal Key Ordering

[[def: ordinal key, A registry-local chain position tuple ordered lexicographically as height then transaction or instruction index then any additional registry position components then operation index within the anchored batch]]

Ordinals order valid confirmations on the predecessor's expected chain registry. Equal positions of distinct competing operations use canonical CID as a tie-breaker. Unanchored siblings use canonical CID alone. These rules and the required receipt fields are specified in Protocol Rules; ordinals alone do not establish convergence or compare positions across registries.
