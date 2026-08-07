## Archon Extensions to DID Core

The `did:cid` method defines three structural elements that extend the [[ref: DID-CORE]] data model: `didDocumentRegistration`, the agent/asset subject type distinction, and `didDocumentData`. Together they enable the method's key design goals — pluggable registry anchoring, a verifiable ownership graph, and an open application data layer.

These extensions are **normative for `did:cid`**: conforming implementations MUST produce and interpret them as specified in this section. They are not, however, part of the [[ref: DID-CORE]] data model, and this method therefore does not place them in the DID document. Each is exposed instead as a resource *dereferenced* from a DID URL — `did:cid:<cid>/registration` and `did:cid:<cid>/data` (see DID URL Dereferencing). That separation is deliberate: it is what allows a `did:cid` resolution result to remain conformant with [[ref: DID-CORE]] while these elements stay binding on implementations.

::: note
Because they are dereferenced resources, `didDocumentRegistration` and `didDocumentData` are **not** members of the DID resolution result (the `didDocument` / `didResolutionMetadata` / `didDocumentMetadata` triple), and MUST NOT be returned inline within it.
:::

---

### `didDocumentRegistration`

[[def: didDocumentRegistration, A method-defined resource, dereferenced at the /registration DID URL, that records the protocol version, DID subject type, and chosen registry for a DID — metadata required to correctly interpret and resolve the DID]]

[[ref: DID-CORE]] defines no mechanism for a DID method to attach method-specific configuration to a DID. The `did:cid` method defines a `didDocumentRegistration` object for this purpose. Every `did:cid` DID MUST have one; it is populated at creation time and cannot be absent:

```json
{
  "didDocumentRegistration": {
    "version": 1,
    "type": "agent",
    "registry": "hyperswarm"
  }
}
```

| Field | Description |
|-------|-------------|
| `version` | Protocol version number. Enables forward-compatible evolution of the method. |
| `type` | DID subject type: `"agent"` or `"asset"`. Determines the resolution and update rules that apply. |
| `registry` | The [[ref: registry]] used to record update operations. Only one registry is active at a given time. |

The `registry` field is the binding between a DID and its update ledger. Resolvers use it to determine where to look for update operations. The registry may be changed by the controller via a valid signed update operation — only the most recently confirmed registry is active. A change of registry does not invalidate operations previously recorded on the prior registry; those remain part of the verifiable [[ref: operation chain]].

---

### DID Subject Types: Agent and Asset

Most DID methods treat all DIDs identically — every DID is a self-controlled, key-bearing entity. The `did:cid` method introduces a formal distinction between two subject types, reflecting the natural hierarchy found in credential ecosystems.

**[[ref: agent, Agents]]** are key-bearing DIDs. An agent:
- Possesses a cryptographic key pair
- Controls its own DID document via signed update operations
- Can act as the controller of one or more [[ref: asset]] DIDs
- Represents entities that take action: users, issuers, verifiers, nodes, and AI agents

**[[ref: asset, Assets]]** are keyless DIDs. An asset:
- Has no cryptographic keys of its own
- Is controlled by exactly one [[ref: agent]] DID at any given time (specified in the `controller` field)
- Can be transferred to a new controller via a valid update operation signed by the current controller
- Holds application data in `didDocumentData`
- Represents entities that are acted upon: verifiable credentials, schemas, presentations, challenges, and responses

This distinction enables a verifiable ownership graph: any observer can resolve an asset DID and determine its current controller, then resolve the controller to verify the controlling agent's current key state. Transfers are recorded in the [[ref: operation chain]] and resolvable at any historical point in time.

::: note
The agent/asset distinction is expressed in `didDocumentRegistration.type`. Resolvers MUST use this field to apply the correct creation, update, and resolution rules for the DID.
:::

---

### `didDocumentData`

[[def: didDocumentData, A method-defined resource, dereferenced at the /data DID URL, that provides an open, structured application data layer — a JSON object in which Keymaster features and higher-level applications store state that must be associated with the DID and synchronized across the network]]

[[ref: DID-CORE]] defines a `service` property for attaching typed service endpoint references to a DID document — external URIs pointing to services associated with the DID subject. `didDocumentData` serves a distinct purpose: it is a structured data store for arbitrary JSON state that must be cryptographically bound to the DID itself, versioned alongside it, and resolvable at any point in its history. The `did:cid` method defines `didDocumentData` as an open extension point, dereferenced at `/data`. Its content is not constrained by the method specification — any Keymaster feature or application layer can read and write properties within it using standard DID update operations.

The general pattern is that each higher-level feature reserves a named property within `didDocumentData`:

```json
{
  "didDocumentData": {
    "<feature-key>": { ... }
  }
}
```

Because `didDocumentData` is updated via the same signed update operations as the rest of the DID document, all changes are anchored to the [[ref: registry]], versioned via the [[ref: operation chain]], and resolvable at any historical point in time via [[ref: temporal resolution]].

#### Known Uses

The following `didDocumentData` properties are used by the Archon platform as of this writing. This list is illustrative, not exhaustive — new Keymaster features will continue to add properties over time:

| Property | Feature | Description |
|----------|---------|-------------|
| `backupStore` | Identity backup | On an [[ref: agent]] DID: a DID reference to an encrypted backup asset (which holds the agent's credentials and relationships under a `backup` property); enables full identity recovery from the seed phrase alone |
| `manifest` | DID Manifest | On an [[ref: agent]] DID: selectively disclosed public credentials (described below) |
| `vault` | Encrypted group storage | On a vault [[ref: asset]] DID: a [[def: vault, A shared encrypted file store associated with a group DID, accessible to group members via individually derived keys — supports both standard and secret membership configurations]] |

Application developers building on `did:cid` are encouraged to use `didDocumentData` for any state that must be cryptographically bound to a DID, publicly resolvable, and part of the verifiable update history.

#### DID Manifest

[[def: DID Manifest, An object within didDocumentData.manifest mapping the DID of each held verifiable credential to a manifest entry, through which an agent voluntarily discloses credentials publicly — in publish mode (announcing the credential's existence only) or reveal mode (exposing the full credential)]]

The [[ref: DID Manifest]] illustrates the `didDocumentData` pattern well because it has a clearly defined structure and a two-mode API. It is one specific feature built on `didDocumentData` — not an architectural primitive in its own right.

The manifest is an object within `didDocumentData.manifest` where each key is the DID of a held [[ref: verifiable credential]] and each value is the manifest entry for that credential. It supports two disclosure levels:

| Mode | `reveal` | Content | Description |
|------|----------|---------|-------------|
| **Publish** | `false` | Credential DID reference | Announces credential ownership without exposing content |
| **Reveal** | `true` | Full Verifiable Credential | Makes the complete credential publicly verifiable by any resolver |

Manifest entries are managed via the Archon Keymaster. Each valid operation generates a DID update that modifies `didDocumentData.manifest` and is anchored to the [[ref: registry]].

A partial example of a resolved DID with a revealed credential in the manifest:

```json
{
  "didDocumentData": {
    "manifest": {
      "did:cid:bagaaiera...cred1": {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", "ArchonSocialNameCredential"],
        "id": "did:cid:bagaaiera...cred1",
        "issuer": "did:cid:bagaaiera...issuer",
        "issuanceDate": "2026-02-03T00:12:20.000Z",
        "credentialSubject": {
          "id": "did:cid:bagaaiera...agent",
          "name": "@flaxscrip",
          "platform": "archon.social"
        },
        "proof": {
          "type": "EcdsaSecp256k1Signature2019",
          "created": "2026-02-03T00:12:20.000Z",
          "verificationMethod": "did:cid:bagaaiera...issuer#key-1",
          "proofPurpose": "assertionMethod",
          "proofValue": "..."
        }
      }
    }
  }
}
```

Revealed credentials are independently verifiable by any resolver using the standard [[ref: temporal resolution]] algorithm — no interaction with the issuer is required.

::: note
The manifest pattern is particularly relevant for AI agents operating in multi-agent systems. An agent that reveals a role credential and a principal relationship credential enables any peer agent or service to verify its authorization by resolving its DID — without out-of-band communication or centralized lookup.
:::

::: warning
Revealing a credential in the manifest is permanent at the registry history level. Removing it via `unpublish` removes it from the current DID document, but it remains visible in any historical version resolvable via [[ref: temporal resolution]].
:::
