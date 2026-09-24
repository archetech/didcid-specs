## DID Resolution

[[def: resolution, The process of returning the DID document and its metadata for a given DID — distinct from dereferencing, which returns a resource identified by a DID URL]]

Resolution is the operation of returning a DID Document and its metadata for a given DID. It is distinct from *dereferencing*, which returns a resource identified by a DID URL (see DID URL Dereferencing).

Given a DID and an optional resolution time, the resolver uses its locally retained operation history and [[ref: seed document]], ordinarily received through Hyperswarm gossip. When creation content is missing locally, it retrieves that content from IPFS using the DID suffix as the CID. Retrieved content is parsed and validated before use; the retrieval channel does not establish authorization.

### Resolution Options

The `did:cid` method supports the following resolution options per [[ref: DID-CORE]]:

| Option | Type | Description |
|--------|------|-------------|
| `versionTime` | ISO 8601 datetime | Resolve the DID document as it existed at or before this point in time |
| `versionSequence` | integer | Resolve at a specific operation sequence number (1-indexed from creation) |
| `versionId` | CID string | Resolve at the operation identified by this specific CID |

If no option is specified, the resolver returns the most recent confirmed version.

::: note
`versionId` accepts the CID of any operation in the DID's [[ref: operation chain]], enabling pinpoint resolution at any historical state. This is the most precise resolution mode — `versionTime` and `versionSequence` both reduce to a `versionId` lookup internally once the target operation is identified.
:::

---

### Resolution Algorithm

Resolution computes a predecessor-linked accepted history from available evidence under Protocol Rules. It MUST NOT select branches by receipt arrival order or merely sort all operations by time. Missing controller history can change authorization when it arrives.

Conceptually, a resolver:

1. Uses the locally retained content-addressed creation operation, falling back to IPFS if unavailable locally, and validates it.
2. Incorporates locally trusted registry evidence and unconfirmed hints, validating their targets and receipt shapes.
3. Reconstructs self-controlled agent histories, selecting valid competing successors; then revalidates asset histories against their agents. Deferred predecessors and changed authority are reconsidered until the accepted state settles.
4. Applies the requested version/time bound to the predecessor-linked history without skipping excluded predecessors. Hyperswarm and pin use intrinsic proof time; local creation uses operation `created` and local mutations use `proof.created`; chain receipts retain chain time and position.
5. For this specification's conformant HTTP surface, returns the confirmed, verified projection as the DID Core result, exposing data and registration separately by dereferencing.

A cached projection MUST be consistent with replay of the same retained evidence. Unsupported-registry delegation is a resolver service policy; it does not import or confirm peer history.

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

If a node cannot fulfill a resolution request — either because required content remains unavailable after local lookup and fallback retrieval or because the DID's specified registry is not supported — the node must forward the request to a trusted node. The forwarding chain is:

1. **Registry not supported** → forward to a trusted node that monitors the specified registry.
1. **No trusted node for registry** → forward to a general-purpose fallback node.
1. **Required content unavailable** → forward to a peer that may already retain the content through gossip or have access to it through fallback retrieval.

### Ordinal Key Ordering

[[def: ordinal key, A registry-local chain position tuple ordered lexicographically as height then transaction or instruction index then any additional registry position components then operation index within the anchored batch]]

Ordinals order valid confirmations on the predecessor's expected chain registry. Equal positions of distinct competing operations use canonical CID as a tie-breaker. Unanchored siblings use canonical CID alone. These rules and the required receipt fields are specified in Protocol Rules; ordinals alone do not establish convergence or compare positions across registries.
