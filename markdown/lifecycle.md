## DID Lifecycle

DIDs are created without a central registrar or registry transaction. Each DID identifies its signed creation operation by content hash. A node can resolve it when it has the creation operation and the evidence needed for authorization.

Archon distributes creation, update, and deletion operations, including batch asset operations, through Hyperswarm gossip, except for DIDs using the `local` registry. Nodes retain that evidence locally; IPFS provides fallback retrieval for missing content. This gossip transport is used even when a DID selects a blockchain registry.

The chosen [[ref: registry]] supplies confirmation and ordering under Protocol Rules. Creation does not need to wait for a chain anchor, although creation operations can also be included in anchored batches. Creation selects the initial registry. The predecessor registry confirms a migration, and the new registry governs its successors; the content-addressed identity does not change.

### Lifecycle States

| State | `deactivated` | Document | Description |
|-------|---------------|----------|-------------|
| Created | `false` | Seed document | Content-derived identity, resolvable when required evidence is available |
| Active | `false` | Latest version | One or more valid updates applied |
| Revoked | `true` | `id` only | Terminal on the accepted branch; later evidence may replace that branch |