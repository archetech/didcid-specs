## Protocol Rules

This section specifies version-1 operation acceptance and evidence selection. It describes the Archon v0.13 implementation; the conformant DID Core result remains the separate presentation defined in DID Resolution and DID URL Dereferencing.

### Distribution and retrieval

A DID is derived by signing and hashing its creation operation, without a registrar or registry transaction. Archon distributes creation, update, and deletion operations—including batch asset operations—through Hyperswarm gossip. Operations for DIDs using the `local` registry are excluded from gossip. Gossip receipt alone does not confer chain confirmation. Nodes use retained operation/history data first, with IPFS as fallback retrieval for missing content. IPFS storage and optional auxiliary pinning support availability; they do not create identity or grant authorization.

### Identity and admission

The operation ID is the CIDv1 lowercase-base32 identifier of the complete signed operation, including its proof, serialized with JCS (RFC 8785). Archon uses the JSON multicodec (`0x0200`) and SHA-256 multihash. A creation's DID is derived from that operation and its method prefix. Updates and deletions target their signed `did`. An envelope `did`, when supplied, MUST match this target; a creation's extraneous `did` cannot override content-derived identity. Signature equality alone is not operation identity.

A retrieval CID may refer to noncanonical JSON encoding of the same operation. Implementations derive the canonical operation ID from fetched content and retain the reference as a content-backed alias. A known alias may satisfy an existing signed `previd`; neither the signed predecessor bytes nor the operation may be rewritten. Peer-claimed IDs alone MUST NOT establish aliases. The historical TypeScript numeric-key serialization reference is also derived from known content for predecessor compatibility; this does not change new canonical IDs. Unknown references remain unresolved.

This specification defines registration version `1`. Operations governed by this version MUST use `registration.version: 1`. Registration requires `type` equal to `agent` or `asset`, and a registry name of 1–128 characters matching `[A-Za-z0-9][A-Za-z0-9:_-]*`. Registry validation is name-shape validation, not a closed list of supported chains. Local submission/queue support is a separate node capability.

Version 1 retains the maximum operation size of 65,536 UTF-16 code units in compact JSON serialization; it is not a 65,536 UTF-8 byte limit. Optional undefined object members in SDK inputs serialize as omitted JSON members; this does not make explicit null a valid registration or document replacement.

### State transitions

- An agent creation is self-signed by `publicJwk`, names `#key-1`, and MUST NOT supply an explicit controller. Agents remain self-controlled: an updated document may omit its controller or name only its own DID.
- An asset creation or resulting ownership transfer requires one active, self-controlled agent owner. Assets cannot own assets. A local-only controller cannot create a non-local asset. A transfer is signed by the previous owner; no new-owner countersignature is required.
- Supplied `didDocument`, `didDocumentData`, and `didDocumentRegistration` components replace the whole component. Omitted components retain their previous values. No field-level merge occurs. Resolver metadata is not writable operation state.
- The resulting document retains its DID. A registration replacement retains genesis version, subject type, and prefix presence/value. A supplied replacement must contain all required registration fields; null, scalar, array, or partial registration replacements are invalid.
- The predecessor registration determines which registry confirms a successor. A registry migration is confirmed on the old registry; its successors use the new one.
- A deletion requires a live predecessor and the same authority selection as an update. It clears the DID document to its `id`, clears data, retains registration, marks deactivation, and omits `updated`. No successor may extend a deletion; later evidence can replace the branch containing it.

Verification-method IDs MUST be unique after resolving relative fragments against the document DID: `#key-1` and `<did>#key-1` cannot both occur, even with identical keys. Distinct method names may share key material, and a later version may replace the key under an existing method name.

Current version-1 operation verification selects the named method from `verificationMethod`; it does **not** enforce membership in `capabilityInvocation`. Stricter relationship enforcement is deferred for compatibility. Credential proof-purpose policy is separate.

Optional `validUntil` uses the accepted RFC 3339 string grammar and may change or be omitted in a complete replacement. Expiry drives local garbage collection, not a new per-operation authorization deadline or a signed deletion. Convergence claims require the same retained evidence, not identical local GC timing.

### Operation Authorization

Direct update/delete submission requires the current accepted head as `previd` before storage or queue writes. Import may select an earlier live predecessor when evaluating a competing branch; missing predecessors remain deferred. The predecessor reference identifies the complete previous operation, not a resolved-document hash.

Agent updates and deletions use the named key in their selected predecessor document. Asset operations use the predecessor owner (or creation's proposed owner), with the controller document selected as follows:

- Without qualifying chain evidence, select controller history at the operation's `proof.created`.
- With a chain receipt and a controller whose confirmed prefix is chain-anchored, controller events on that same registry must be strictly before the operation's ordinal. Controller events on other registries are bounded by the operation's block time; ordinals do not compare across registries.
- Determine the controller's confirmed prefix using each version's predecessor registry. Wrong-registry receipts and unconfirmed suffixes cannot establish chain anchoring. Pin has no chain clock and cannot itself establish anchoring.
- Local, Hyperswarm, and pin receipts always use proof-time authorization, even if their envelopes contain registration metadata or ordinals.

Hyperswarm and pin envelope times are normalized to the operation's `proof.created`; local creation uses operation `created`, and local updates/deletions use `proof.created`. The same normalization applies to recovered candidates. Historical bounds select a predecessor-linked prefix: stop at an excluded predecessor rather than skipping it to admit a later successor with an earlier claimed time. Chain receipts retain authoritative block time and ordinal.

A key retired by the selected chain position cannot authorize an asset operation there, even if the operation claims it was signed earlier. Verification checks the signature against the selected document; it MUST NOT also require a second proof-time document after choosing chain-position authority.

### Chain receipts and anchored batches

A chain event MUST contain a valid registry name, an RFC 3339 authoritative block `time`, and complete registration metadata: `height`, `index`, `txid`, `batch`, `opidx`. Position fields are nonnegative safe integers; `txid` and `batch` are nonempty strings. `batch` identifies the anchored batch DID.

The ordinal is `[height, index, ...registryPosition, opidx]`, with first, second, and last components matching registration. Bundled BTC, ZEC, ETH, and SOL mediators use `[height, index, opidx]`. Additional registry position components participate in lexicographic comparison. Incomplete chain receipts are invalid; there is no metadata-free chain-receipt category. Unanchored ordinals are optional; when present, they are arrays of nonnegative safe integers (possibly empty).

The anchored batch DID commits to its signed create operation and original ordered batch CID list. Mediators MUST retrieve its genesis DID document and use `didDocumentData.batch.ops`, never the mutable current batch asset. Archon's `getGenesis(did)` (`GET /api/v1/did/:did/genesis`) checks content identity and creation structure without resolving publisher authority or changing accepted history. It returns the genesis document set, not the raw operation and not a DID Core resolution result. Genesis retrieval checks the local operation cache first and falls back to IPFS when it lacks valid content. The original signed operation remains retrievable by CID for provenance; genesis retrieval does not assert signature authorization.

CID batch ingress requires the chain position prefix and complete `height`, `index`, `txid`, `batch` metadata. It derives `opidx` from each CID's **original list index**, including gaps for unavailable entries. Later batch updates cannot change an existing anchor's operation order. Each contained operation undergoes normal authorization.

Only locally trusted registry mediators supply confirmation on that registry. Peer-relayed chain claims become unconfirmed Hyperswarm hints. Mediators skip unavailable batches/operations, persist failures for retry across restart, and continue with later entries; unavailable and nonexistent content cannot be distinguished. Recovery retains original chain positions and times.

A reorganization withdraws orphaned receipts and block metadata before committing a new scan position and removes orphaned discovered batches. Signed operations remain as unconfirmed hints; dependent histories are replayed. Bundled Ethereum and Solana imports use finalized RPC data with no confirmed/latest fallback. Bitcoin and Zcash retain confirmation-depth scanning and reorg recovery. Storage pinning supplies no chain ordering priority. When enabled as a DID registry, a `pin` receipt can confirm a pin-registered DID without establishing chain anchoring.

### Deterministic selection and replay

Among valid competing successors of one predecessor:

1. A confirmation on the predecessor's expected chain registry outranks provisional hints.
2. Competing confirmations on that chain compare complete ordinals lexicographically; equal ordinals for distinct operations compare canonical CID.
3. If neither confirms on the expected chain, the lexicographically smallest canonical CID wins, using ASCII order of lowercase base32 strings. This includes local, Hyperswarm, pin, and wrong-registry anchors. Receipt/proof timestamps and delivery order do not choose these siblings.

This is sibling preference, not a global CID sort; predecessors still precede successors. Repeated anchors of the **same** operation remain distinct evidence. An earlier valid expected-chain anchor replaces a later accepted anchor only after reauthorization at the earlier position. Local and Hyperswarm candidate deduplication retains the first observation of an operation per registry after intrinsic-time normalization. Pin uses the same intrinsic clock and authorization rule, but its candidate retention also distinguishes ordinal representations; those ordinals never choose competing unanchored siblings.

Imported candidates, including currently rejected and displaced branches, are retained separately from accepted histories. Changes to controller history or anchor evidence MUST reconsider dependent histories and deferred predecessors. Removing controller evidence also revalidates dependents. Startup reconstructs accepted state before serving history reads. Accepted-history exports alone do not preserve every candidate or retrieval alias required for reconstruction.

`confirmed` records expected-registry anchoring; it does not prove all controller history is available or authorization is irrevocable. Nodes compute their best state from available evidence. Agreement requires the same retained evidence, protocol rules, and interpretation of trusted registry data.


### Formally Proved Properties

Archon's Lean proofs establish these major behaviors of the protocol model:

- **Convergence:** The same retained operations and chain evidence produce the same accepted histories and semantic DID states, regardless of arrival order or duplicates.
- **Termination:** Modeled reconciliation finishes at a stable result, including reconstruction from stale published histories.
- **Deterministic fork selection:** Competing operations and repeated anchors follow the canonical-CID and chain-position rules, including authorization at the selected anchor.
- **Agent authorization:** Updates follow predecessor keys and named verification methods, including key rotation and deletion.
- **Asset authorization:** Ownership, transfers, and updates use the appropriate historical controller state.
- **Registry migration:** The old registry confirms a migration; the new registry governs its successors.
- **Document transitions:** Whole-component replacement, omitted-component preservation, and deletion produce consistent final state.

These results apply to the protocol model under its documented assumptions: finite retained evidence, the same complete canonical operations and normalized predecessor references, the same protocol configuration, and an authoritative chain snapshot satisfying the receipt contracts. Semantic equality includes accepted operation paths, document/data/registration values, deactivation, and the receipt facts used for historical authorization; it is not byte-for-byte equality of every API response.

Signed TypeScript/Rust correspondence tests connect the model to Archon's implementations. They do not constitute a universal proof of the executable code, cryptographic primitives, storage/concurrency behavior, or network delivery. The result does not promise agreement between nodes retaining different evidence; if evidence eventually settles to the same set, modeled reconciliation reaches the same result.

See the [exact theorem claim and assumptions](https://github.com/archetech/archon/blob/bdc57d7f1d1c750e2f545dd465a1c5f10c96b7cc/docs/plans/protocol-convergence-theorem.md) and the [completed proof roadmap](https://github.com/archetech/archon/blob/bdc57d7f1d1c750e2f545dd465a1c5f10c96b7cc/docs/plans/protocol-convergence-completion.md).
