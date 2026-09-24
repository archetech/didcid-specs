## DID Document

A `did:cid` resolution returns the three members defined by the [[ref: DID-CORE]] DID Resolution data model — the *resolution result*:

```json
{
  "didDocument": { ... },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  },
  "didDocumentMetadata": { ... }
}
```

`didDocument` and `didDocumentMetadata` conform to [[ref: DID-CORE]]; `didResolutionMetadata` conforms to the DID Resolution specification and carries the `contentType` of the returned representation (see the Representations subsection under DID Resolution).

The method-specific `didDocumentData` and `didDocumentRegistration` objects are **not** part of the resolution result. They are Archon extensions (described in the Archon Extensions to DID Core section), retrieved separately as dereferenceable resources at the `/data` and `/registration` DID URLs (see DID URL Dereferencing). The examples in the subsections below show the resolution result for each DID type, as returned by `GET /1.0/identifiers/<did>`.

::: note
The [[ref: operation chain]] is the authoritative source of truth for a `did:cid` DID. The Gatekeeper stores individual operations (create, update, delete) and reconstructs the DID document by selecting and replaying predecessor-linked histories under Protocol Rules, including [[ref: ordinal key]] and canonical-CID sibling preference. Implementations MAY cache resolved documents for performance, but any cached result MUST remain consistent with a fresh replay of the canonical operation chain.
:::

---

### Agent DID Document

A resolved [[ref: agent]] DID document includes a verification method and the standard DID Core verification relationships:

```json
{
  "didDocument": {
    "@context": [
      "https://www.w3.org/ns/did/v1"
    ],
    "id": "did:cid:bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka",
    "verificationMethod": [
      {
        "id": "#key-1",
        "controller": "did:cid:bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka",
        "type": "EcdsaSecp256k1VerificationKey2019",
        "publicKeyJwk": {
          "kty": "EC",
          "crv": "secp256k1",
          "x": "OSd_CMNPrDPDsV5YoWajZol2ZUGeXD8hR3XubkcWcX4",
          "y": "yBLNwQllxyR5Omgo9b7LmJEfd1pGNiZZqzgqafZ4Qcs"
        }
      }
    ],
    "authentication": [
      "#key-1"
    ],
    "assertionMethod": [
      "#key-1"
    ],
    "capabilityInvocation": [
      "#key-1"
    ]
  },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  },
  "didDocumentMetadata": {
    "created": "2026-09-22T00:00:00Z",
    "versionId": "bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka",
    "versionSequence": "1"
  }
}
```

#### Verification Relationships

`did:cid` agent DIDs support the following [[ref: DID-CORE]] verification relationships:

| Relationship | Purpose |
|---|---|
| `capabilityInvocation` | Expresses permission to sign DID operations; current version-1 verification still checks named-method membership only |
| `authentication` | Proves control of the DID — used when the agent must authenticate itself to a verifier |
| `assertionMethod` | Signs verifiable credentials and other assertions |

The initial verification method is referenced as `#key-1`. After key rotation via an update operation, the new method identifier increments (`#key-2`, `#key-3`, etc.) and the client updates relationships that refer to the rotated key, including `capabilityInvocation`. This incrementing name is a client convention, not a protocol requirement; a method name may be retained while its key changes. Historical keys remain resolvable via [[ref: temporal resolution]].

#### Authentication

An [[ref: agent]] authenticates by signing a challenge with the private key corresponding to the method in its `authentication` verification relationship. A verifier resolves the agent's DID (at the time of the challenge) to obtain the then-active public key, then verifies the signature.

This enables DID-native, decentralized authentication: any party that can resolve a `did:cid` DID can authenticate a `did:cid` agent without relying on a centralized identity provider or certificate authority.

#### Service Endpoints

Agent DIDs may include service endpoint entries per [[ref: DID-CORE]] Section 5.4. Services are declared in the `service` array and updated via standard DID update operations:

```json
{
  "service": [
    {
      "id": "#lightning",
      "type": "lightning",
      "serviceEndpoint": "https://drawbridge.example.com/lightning"
    }
  ]
}
```

Service endpoints are optional. Any DID Core-conformant service type may be used; `did:cid` imposes no constraints on service endpoint structure beyond those defined in [[ref: DID-CORE]].

---

### Asset DID Document

A resolved [[ref: asset]] DID document identifies its controlling agent. That agent authorizes its updates, transfers, and deletion. Its application data is not part of the resolution result — it is dereferenced separately at `/data` (shown below):

```json
{
  "didDocument": {
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": "did:cid:bagaaiera...asset",
    "controller": "did:cid:bagaaieradidcs4hohalzexldr5mdmbmt553tqq3ifqd56mvhifppvyfdc32q"
  },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  },
  "didDocumentMetadata": {
    "created": "2026-01-14T19:32:24Z",
    "versionId": "bagaaiera...asset",
    "versionSequence": "1"
  }
}
```

The asset's application data is retrieved by dereferencing `did:cid:<cid>/data` (see DID URL Dereferencing):

```json
{
  "group": {
    "name": "testgroup",
    "members": []
  }
}
```

Asset DIDs support transfer of control: a controller may update the `controller` field to a new agent DID via a valid update operation. Only one controller is valid at any given time.

---

### Metadata Objects

#### didResolutionMetadata

The `didResolutionMetadata` object is added by the resolver at resolution time and conforms to the DID Resolution specification:

| Field | Description |
|-------|-------------|
| `contentType` | Media type of the returned representation (`application/did+ld+json` or `application/did+json` — see the Representations subsection under DID Resolution) |

#### didDocumentMetadata

The `didDocumentMetadata` object conforms to [[ref: DID-CORE]] and includes Archon-specific extensions:

| Field | Source | Description |
|-------|--------|-------------|
| `created` | DID Core | ISO 8601 timestamp of initial DID creation |
| `updated` | DID Core | ISO 8601 timestamp of most recent update |
| `deactivated` | DID Core | `true` if the DID has been revoked via a delete operation |
| `versionId` | DID Core | CID of the most recent operation in the [[ref: operation chain]] |
| `versionSequence` | Archon | Sequence number of the most recent operation, returned as a string |

::: note
The method-specific anchoring-provenance fields `confirmed` and `timestamp` are **not** [[ref: DID-CORE]] document metadata and are therefore not carried in `didDocumentMetadata`. They are returned with the `/registration` resource instead — see DID URL Dereferencing.
:::
