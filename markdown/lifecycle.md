## DID Lifecycle

DIDs are created locally without a central registrar or registry transaction. Each DID identifies its signed creation operation by content hash. A node can resolve it when it has the creation operation and the evidence needed for authorization.

Archon distributes non-local creation, update, and deletion operations, including batch assets, through Hyperswarm gossip. Nodes retain that evidence locally; IPFS provides fallback retrieval for missing content. This gossip transport is used even when a DID selects a blockchain registry. Local-only DIDs are not queued for gossip.

The chosen [[ref: registry]] supplies confirmation and ordering under Protocol Rules. Creation does not need to wait for a chain anchor, although creation operations can also be included in anchored batches. A migration changes the registry used by subsequent operations, not the content-addressed identity.

### Lifecycle States

| State | `deactivated` | Document | Description |
|-------|---------------|----------|-------------|
| Created | `false` | Seed document | Content-derived identity, resolvable when required evidence is available |
| Active | `false` | Latest version | One or more valid updates applied |
| Revoked | `true` | `id` only | Terminal on the accepted branch; later evidence may replace that branch |