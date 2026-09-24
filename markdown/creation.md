## DID Creation

[[def: create operation, The signed initial operation whose canonical content determines the CID used as the DID suffix]]

A DID is derived from its signed creation operation without a registrar or registry transaction. Archon distributes creation, update, and deletion operations through Hyperswarm gossip, except for DIDs using the `local` registry; IPFS provides fallback retrieval. Registry confirmation is separate from creation and distribution.

The `did:cid` method supports two main types of DID Subject: [[ref: agent]] and [[ref: asset]]. Agents have keys and control assets. Assets are controlled by a single agent (the owner of the asset), which authorizes their updates, transfers, and deletion. Agents cannot delegate control to another DID. The two types have slightly different creation methods.

### Create an Agent DID

To create an [[ref: agent]] DID, the client must sign and submit a create operation to a node:

1. Generate a new private key
   - We recommend deriving a new private key from a Hierarchical Deterministic (HD) wallet (BIP-32).
1. Generate a public key from the private key.
1. Convert the public key to [[def: JWK, JSON Web Key — a JSON representation of a cryptographic key, per RFC 7517]] format.
1. Create an operation object with these fields in any order:

   | Field | Required | Description |
   |-------|----------|-------------|
   | `type` | Yes | Must be `"create"` |
   | `registration.version` | Yes | Must be `1` |
   | `registration.type` | Yes | Must be `"agent"` |
   | `registration.registry` | Yes | A valid registry identifier, e.g. `"BTC:mainnet"`, `"hyperswarm"` |
   | `publicJwk` | Yes | The public key in JWK format |
   | `created` | Yes | ISO 8601 timestamp |
   | `blockid` | No | Current block ID on registry (if registry is a blockchain) |

1. Sign the JSON with the private key corresponding to the public key (this enables the node to verify that the operation is coming from the owner of the public key).
   - The `proof.verificationMethod` must be set to `#key-1` (a relative reference) since the DID does not yet exist.
1. Submit the signed operation to a node's DID endpoint.

#### Agent Create Example

```json
{
    "type": "create",
    "created": "2026-09-22T00:00:00.000Z",
    "registration": {
        "version": 1,
        "type": "agent",
        "registry": "hyperswarm"
    },
    "publicJwk": {
        "kty": "EC",
        "crv": "secp256k1",
        "x": "OSd_CMNPrDPDsV5YoWajZol2ZUGeXD8hR3XubkcWcX4",
        "y": "yBLNwQllxyR5Omgo9b7LmJEfd1pGNiZZqzgqafZ4Qcs"
    },
    "proof": {
        "type": "DataIntegrityProof",
        "cryptosuite": "archon-ecdsa-secp256k1-jcs-2026",
        "created": "2026-09-22T00:00:00.001Z",
        "verificationMethod": "#key-1",
        "proofPurpose": "capabilityInvocation",
        "proofValue": "esafZoTsLCbrza6GTFuca4sFFHT4S4FJFT9KwBqNhMQXneC5gPgjdNraDML2UXZ0xHf4XScAFm-MZjV_jFsUFw"
    }
}
```

Upon receiving the operation, the node must:

1. Verify the proof.
1. Apply [[ref: JCS]] to the operation object.
1. Retain the [[ref: seed document]] and distribute it through Hyperswarm unless the DID uses the `local` registry. Archon also stores content in IPFS for fallback retrieval; storage does not grant the identifier or authorize the operation.

The complete signed agent operation above has canonical CID `bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka`, yielding DID `did:cid:bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka`.

These examples use public synthetic private keys (32 bytes of `0x4a` for the initial agent key and `0x4b` for its later rotation). Never use these keys for an identity.

---

### Create an Asset DID

To create an [[ref: asset]] DID, the client must sign and submit a create operation to a node. The asset is controlled by an existing agent, which signs its creation.

1. Create an operation object with these fields in any order:

   | Field | Required | Description |
   |-------|----------|-------------|
   | `type` | Yes | Must be `"create"` |
   | `registration.version` | Yes | Must be `1` |
   | `registration.type` | Yes | Must be `"asset"` |
   | `registration.registry` | Yes | A valid registry identifier |
   | `controller` | Yes | The DID of the owner/controller agent |
   | `data` | Yes | Any non-empty JSON data payload |
   | `created` | Yes | ISO 8601 timestamp |
   | `blockid` | No | Current block ID on registry (if blockchain) |

1. Sign the JSON with the private key of the controller.
   - The `proof.verificationMethod` must be the **full DID reference** of the controller (e.g., `did:cid:abc123#key-1`).
1. Submit the signed operation to a node's DID endpoint.

#### Asset Create Example

```json
{
    "type": "create",
    "created": "2026-09-22T00:00:01.000Z",
    "registration": {
        "version": 1,
        "type": "asset",
        "registry": "hyperswarm"
    },
    "controller": "did:cid:bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka",
    "data": {},
    "proof": {
        "type": "DataIntegrityProof",
        "cryptosuite": "archon-ecdsa-secp256k1-jcs-2026",
        "created": "2026-09-22T00:00:01.001Z",
        "verificationMethod": "did:cid:bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka#key-1",
        "proofPurpose": "capabilityInvocation",
        "proofValue": "9IBMDVoad50nqfV4N-RMHCb4kY-6Y5pg1to7hJc8DFlGGKg53_ikOzGq5wrvfC68oj4QI5dVdQHLajz7S99J_Q"
    }
}
```

Upon receiving the operation, the node must:

1. Verify the proof is valid for the specified controller.
1. Apply [[ref: JCS]] to the operation object.
1. Retain the seed document and distribute it through Hyperswarm unless the DID uses the `local` registry, with IPFS available for fallback retrieval.

The asset example has DID `did:cid:bagaaierancfl35mj7m4gejwewe2no335bkl527gjlz22dwba5sgybdvevt4q`. Its controller is the agent above. Both creation forms MUST satisfy the Protocol Rules, including identity, registration, size, and authorization checks.
