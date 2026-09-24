## Security Considerations

This section describes the security properties of the `did:cid` method and addresses the security requirements of [[ref: DID-CORE]] Section 10.

### Threat Model

The `did:cid` method is designed to resist the following classes of adversary:

- **Passive observers** — parties who can read all IPFS data, registry contents, and network traffic but cannot forge cryptographic signatures
- **Active network adversaries** — parties who can intercept and modify messages between a client and a node
- **Malicious or compromised nodes** — nodes that may serve stale, incorrect, or selectively withheld DID data
- **Minority registry attackers** — a minority coalition of registry validators acting in bad faith

The method does **not** claim security against:

- An adversary who obtains the controller's private key
- An adversary who controls a majority of the DID's specified [[ref: registry]] (e.g., a blockchain majority attack)
- Loss or unavailability of required operation content from all retained peer copies and fallback retrieval sources

---

### Self-Certifying Identifiers

[[def: self-certifying identifier, A DID whose suffix is derived deterministically from its own creation data, making the identifier itself cryptographic proof of the initial state]]

The DID suffix of a `did:cid` DID is the [[ref: CID]] (Content Identifier) of the JSON-canonicalized creation operation. This makes every `did:cid` DID a [[ref: self-certifying identifier]]: a resolver can independently verify that a given creation operation corresponds to a claimed DID by computing its CID and comparing it to the DID suffix. No trusted third party is required to validate the binding between the DID and its initial public key.

Any modification to the creation operation — including the public key, timestamp, or registration metadata — produces a different CID, and therefore a different DID. This property prevents silent substitution of the creation operation.

---

### Operation Chain Integrity

[[def: operation chain, The hash-linked sequence of create, update, and delete operations associated with a DID, where each operation after creation references the CID of its predecessor via the `previd` field]]

All update and delete operations include a `previd` field containing the [[ref: CID]] of the previous operation in the sequence. This forms an [[ref: operation chain]] — a tamper-evident hash chain anchored at the [[ref: self-certifying identifier]]. An adversary who does not control the signing key cannot:

- **Reorder** operations without invalidating the `previd` chain
- **Insert** a forged operation without producing a valid signature and a known `previd`
- **Replay** a prior update operation, as the current `previd` will have advanced beyond the replayed operation's target

Direct submissions MUST reference the current accepted head before storage or queue writes. Imports may reference an earlier live predecessor to compete with an existing branch; missing predecessors remain deferred. See Protocol Rules.

---

### Registry Security and Finality

The integrity of DID update history depends on the [[ref: registry]] selected by each accepted predecessor. Different registries provide different finality and Byzantine fault-tolerance guarantees:

| Registry | Finality Model | Considerations |
|----------|----------------|----------------|
| **Bitcoin mainnet** | Probabilistic; ~6 confirmations (~60 min) | Highest economic security; reorganization risk decreases exponentially with block depth |
| **Bitcoin Signet / Testnet** | Same model; lower economic stake | Suitable for development and testing; not appropriate for production identity |
| **Hyperswarm** | Unanchored gossip; canonical-CID sibling preference | No chain consensus clock; history follows available signed evidence |
| **Ethereum** | Finalized-block imports (PoS) | High economic security; large validator set; EVM-compatible smart contract anchoring |
| **Zcash** | PoW probabilistic finality | Bundled mediator uses transparent transactions |
| **Solana** | Finalized-block imports (Tower BFT) | Very high throughput; low transaction costs; suitable for high-frequency update patterns |

The `registry` field may be changed by the controller via a valid signed update operation — the predecessor registry confirms the migration and the resulting registry confirms successors. A registry change does not invalidate operations previously recorded on the prior registry; those remain part of the verifiable [[ref: operation chain]] and are still consulted during historical resolution. Resolvers MUST follow the current registry for new operations and MUST consult prior registries when replaying the operation history up to any point before the registry change.

::: note
Node operators SHOULD document the registries they support and their trusted peer node policies. An unsupported local registry does not itself require forwarding. The conformant resolution surface does not delegate to peers; optional fallback on Archon's separate API is described in Fallback and Forwarding.
:::

---

### Cryptographic Operations

All operations MUST apply the JSON Canonicalization Scheme (JCS) to the operation object before computing its CID and before signing. Failure to apply canonicalization consistently may cause the same logical operation to produce different CIDs depending on JSON serialization order, leading to resolution failures or operation rejection.

Operations accept the current `DataIntegrityProof` suite `archon-ecdsa-secp256k1-jcs-2026` and the legacy `EcdsaSecp256k1Signature2019` format. See Proof Verification for the distinct signing payloads. Implementing nodes MUST:

1. Verify the proof signature is cryptographically valid before accepting any create, update, or delete operation.
2. Select the signing authority from the operation predecessor or asset controller cutoff under Operation Authorization.
3. Reject operations with unknown or unsupported `proof.type` values.

---

### Key Management

The `did:cid` method makes the following key management design decisions:

- **Client-side signing only** — Private keys are never transmitted to nodes. Clients sign operations locally and submit only the signed operation and the corresponding public key.
- **HD key derivation** — Clients SHOULD derive keys using BIP-32 hierarchical deterministic derivation from a BIP-39 seed phrase. Implementations SHOULD use hardened derivation paths to prevent child key exposure from compromising the parent key.
- **No server-side key custody** — Nodes have no access to private keys and cannot sign on behalf of DID controllers.

After a key rotation (via an update operation), credentials signed with the previous key remain verifiable through [[ref: temporal resolution]] — the historical key state is preserved and resolvable at any prior version time.

Clients SHOULD:

- Encrypt private key material at rest using a passphrase-derived key.
- Implement key rotation promptly when a key may have been exposed.
- Store the BIP-39 seed phrase in a physically secure, offline location.

---

### Proof Verification Requirements

Credential proofs require `proof.created` to select historical signer state and preserve verification across key rotation. Credential verifiers use that claimed time, not the current time; it is not an independently trusted signing-time attestation.

DID operation proofs also require `created`, but authorization follows Operation Authorization: agent mutations use predecessor keys; asset operations use proof-time or chain-position controller selection as applicable. The timestamp also supplies intrinsic unanchored receipt clocks. Its presence MUST NOT introduce an additional generic credential-time lookup after predecessor or chain-position authority has been selected.

---

### Revocation Finality

Deletion is terminal on its accepted branch. It does not make that branch immune to later evidence revalidation: a preferred sibling or changed controller history can displace a deletion. No operation can extend the deletion itself. Chain confirmation records anchoring, not complete or irrevocable authorization history.

---

### Node Trust Model

Archon's separate API may proxy eligible resolution requests to configured peers; the conformant `/1.0/identifiers` surface does not. The following risks apply to this trust model:

- **Stale data**: A peer node that lags behind the registry may return outdated DID documents, causing verifiers to use superseded keys.
- **Malicious forwarding**: A compromised node may return incorrect or fabricated DID data to the requesting client.
- **Availability dependency**: If no reachable node supports a given registry, resolution fails for DIDs using that registry.

Mitigations:

- Resolvers in high-security contexts SHOULD run their own node directly connected to the DID's specified registry.
- Clients SHOULD validate that the returned document's `versionId` is consistent with the expected [[ref: operation chain]].
- Node operators SHOULD monitor registry sync status and alert on significant lag.

---

### Keymaster and Gatekeeper Trust Model

The `did:cid` method separates key custody from network operations into two distinct components with a well-defined trust boundary.

The **[[def: Keymaster, The client-side wallet component that holds private keys, signs operations locally, and submits them to a Gatekeeper node — private keys never leave the Keymaster]]** holds private keys exclusively on the client and signs all operations locally before submission. The **[[def: Gatekeeper, The server-side node component that interfaces with IPFS, registries, and the broader network — it receives only signed operations and never has access to private keys]]** is the network-facing node that retains signed operations, queues their gossip distribution and registry submission, uses IPFS for fallback content retrieval, and serves DID resolution responses.

Key trust properties of this separation:

- **Keymaster users must trust their Gatekeeper** — The Gatekeeper is responsible for faithfully retaining and distributing operations and submitting them to their registries and for returning accurate resolution results. A compromised Gatekeeper could delay or drop operations, or return stale DID documents. It cannot, however, forge operations, alter signed content, or access private keys.
- **Gatekeepers are interchangeable** — Because the Keymaster signs all operations locally with keys that never leave the client, a controller can switch to a different Gatekeeper at any time — for better availability, geographic proximity, or greater institutional trust — without any change to their DID or credentials.
- **Self-sovereign deployment** — Controllers who require maximum trust and control can operate their own Gatekeeper node. This eliminates reliance on any third party while maintaining full compatibility with the network.
- **SaaS node assurance** — Controllers using a third-party hosted Gatekeeper can do so with the assurance that the node operator cannot access their private keys, cannot sign operations on their behalf, and cannot update or revoke their DID without a valid signature from the controller's Keymaster.

---

### Availability and Denial of Service

**Content availability**: Resolution requires the creation operation and relevant history, normally retained locally after Hyperswarm distribution. An IPFS outage does not prevent resolution from retained evidence. Operators SHOULD maintain gossip connectivity and durable operation storage; IPFS and optional redundant pinning provide fallback availability when local content is missing. Neither a CID nor a chain anchor guarantees content availability.

**Registry unavailability**: Temporary registry unavailability causes resolution to return the most recently known state rather than failing. This is a graceful degradation, not a hard failure, and is consistent with the method's design.

**Creation spam**: DID creation requires signing and content hashing; there is no on-chain transaction required at creation time. Node operators SHOULD implement rate limiting on creation endpoints to prevent resource exhaustion from spam creation.

**Update queue costs**: For registries with non-trivial transaction costs (e.g., Bitcoin mainnet), nodes may batch update operations. Operators SHOULD implement queue management policies that prevent unbounded accumulation of pending updates.

---

### Cryptographic Algorithm Agility

The `proof.type` and, for Data Integrity proofs, `cryptosuite` fields select the proof algorithm. The current operation formats are defined in Proof Verification; legacy acceptance is retained alongside the current Data Integrity suite. Future versions of the method specification may introduce additional proof types (e.g., Ed25519Signature2020, BLS12-381 for threshold schemes).

Existing DIDs using `EcdsaSecp256k1Signature2019` are unaffected by the introduction of new proof types. Nodes MUST continue to support all historically accepted proof types to preserve backward compatibility of [[ref: temporal resolution]] for existing DIDs.

---

### Residual Risks

The following risks remain after the mitigations described in this section:

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Private key compromise | Low (with secure local storage) | High — attacker can update or revoke the DID | Key rotation; monitor for unauthorized update operations |
| BIP-39 seed phrase exposure | Low (with physical security) | Critical — unrecoverable if device is also lost | Hardware wallet; physically separate offline backup |
| Blockchain reorganization | Very low (mainnet, ≥6 confirmations) | Medium — brief resolution inconsistency | Await sufficient confirmations before relying on an update |
| Required content unavailable locally, from peers, and through fallback retrieval | Depends on retention and connectivity | Resolution or authorization may remain incomplete | Durable node storage; gossip connectivity; fallback content retention |
| Trusted node compromise | Low | Medium — stale or incorrect DID data returned | Multi-node resolution; independent registry verification |
