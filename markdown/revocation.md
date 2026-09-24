## DID Revocation

[[def: delete operation, A signed operation that deactivates the accepted branch of a DID by removing its controller, making the DID unresolvable for active use]]

A deletion is terminal on the accepted branch: no update may extend that deletion. Resolution returns `deactivated: true`, an `id`-only DID document, empty data, and retained registration; `updated` is omitted. Later controller or anchor evidence can replace the accepted branch, including its deletion. This is evidence revalidation, not an operation that revives a validly deleted branch.

### Revocation Flow

To revoke a DID, the client must sign and submit a `delete` operation to a node:

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `"delete"` |
| `did` | Yes | The DID to be deleted |
| `previd` | Yes | The CID of the previous operation |
| `blockid` | No | Current block ID on registry (if blockchain) |

### Delete Operation Example

```json
{
    "type": "delete",
    "did": "did:cid:bagaaierancfl35mj7m4gejwewe2no335bkl527gjlz22dwba5sgybdvevt4q",
    "previd": "bagaaierancfl35mj7m4gejwewe2no335bkl527gjlz22dwba5sgybdvevt4q",
    "proof": {
        "type": "DataIntegrityProof",
        "cryptosuite": "archon-ecdsa-secp256k1-jcs-2026",
        "created": "2026-09-22T00:00:03.000Z",
        "verificationMethod": "did:cid:bagaaiera7apdjgpe7jleguoioddew7oqqxn2iqlsowktnbnqksf7bpzuntka#key-2",
        "proofPurpose": "capabilityInvocation",
        "proofValue": "dZGXrKfuK7exvAVncxlzblvjsuph0bi1o8gn9cQKsh9kS9p08D4X3Huweu-b6cKbdF8c9P1-Hwx35Iysx0No2w"
    }
}
```

Upon receiving the operation, the node must:

1. Select the authorizing document under Operation Authorization and verify the proof.
1. For direct submission require the current head as `previd`; import evaluates the selected live predecessor.
1. Record the operation on the predecessor's registry (or forward the request to a trusted node that supports the specified registry).

### Post-Revocation Resolution

After revocation is confirmed on the DID's registry, resolving the DID returns the following result:

```json
{
    "didDocument": {
        "id": "did:cid:bagaaierancfl35mj7m4gejwewe2no335bkl527gjlz22dwba5sgybdvevt4q"
    },
    "didResolutionMetadata": {
        "contentType": "application/did+ld+json"
    },
    "didDocumentMetadata": {
        "created": "2026-09-22T00:00:01Z",
        "deleted": "2026-09-22T00:00:03Z",
        "deactivated": true,
        "versionSequence": "2",
        "versionId": "bagaaierafiknyfexk6badnlvglrmkr57lbijuippd3vp6kql5qtj3i6t267q"
    }
}
```

The metadata `deactivated` field is set to `true` to conform to the [[ref: DID-CORE]] specification for [DID Document Metadata](https://www.w3.org/TR/did-core/#did-document-metadata). Resolution of a revoked DID does not error: the revoked DID's data resource, dereferenced at `/data`, returns an empty object (`{}`) with HTTP 200.

::: warning
No recovery operation can extend a valid deletion. Preserve credentials and references before deleting a DID; later evidence revalidation is not a user recovery mechanism.
:::
