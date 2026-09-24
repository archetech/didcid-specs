## Abstract

The `did:cid` method specification conforms to the requirements specified in [[ref: DID-CORE]], a W3C Recommendation. For more information about DIDs and DID method specifications, please see the [DID Primer](https://w3c-ccg.github.io/did-primer/).

## Introduction

The `did:cid` method is designed to support a P2P identity layer with secure decentralized [[def: verifiable credential, A cryptographically verifiable claim about a subject, conforming to the W3C Verifiable Credentials Data Model 2.0]]. DIDs created using this method are used for two categories of DID Subject:

- [[def: agent, An entity that possesses cryptographic keys and controls assets — e.g., users, issuers, verifiers, and nodes]]
- [[def: asset, An entity controlled by one agent that authorizes its updates, transfers, and deletion — e.g., verifiable credentials, verifiable presentations, schemas, challenges, and responses]]

::: note
The `did:cid` method is optimized for fast, virtually costless identity creation. A signer creates a DID by deriving its identifier from the signed creation operation, without a central registrar or an on-chain transaction. Archon distributes creation, update, and deletion operations through Hyperswarm gossip, except for DIDs using the `local` registry, with IPFS providing fallback retrieval. Registry anchoring supplies confirmation and ordering separately from content distribution.
:::

### Design Goals

1. **Decentralized creation** — DIDs are derived from signed creation operations, enabling use by nodes with the required evidence before registry anchoring.
2. **Decentralized updates** — DID mutations are registered on a pluggable [[def: registry, A decentralized ledger or database (e.g., BTC, ETH, hyperswarm) used to record DID update operations]] initially specified at creation and changeable by an authorized registry migration, preserving the decentralization requirement across the entire lifecycle.
3. **Temporal resolution** — DIDs can be resolved at any historical point in time, enabling verification of credentials signed with keys that have since been rotated.
4. **Agent/Asset duality** — The method explicitly distinguishes between key-bearing [[ref: agent]]s and agent-controlled [[ref: asset]]s, reflecting the natural authority hierarchy in credential ecosystems.