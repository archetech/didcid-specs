## DID Lifecycle

All `did:cid` DIDs begin life anchored to IPFS. Once created they can be used immediately by any application or service connected to a node that can resolve the seed document from IPFS. Subsequent updates to the DID (meaning that a document associated with the DID changes) are registered on a [[ref: registry]] such as a blockchain (BTC, ETH, etc.) or a decentralized database (e.g., hyperswarm). The registry is specified at DID creation so that nodes can determine which single source of truth to check for updates.

The **key concept of this design** is that DID creation is decentralized through IPFS, and DID updates are decentralized through the registry selected by the accepted predecessor state. The DID is decentralized for its whole lifecycle, which is a hard requirement of DIDs.

### Lifecycle States

| State | `deactivated` | Document | Description |
|-------|---------------|----------|-------------|
| Created | `false` | Seed document | Initial anchor on IPFS, resolvable immediately |
| Active | `false` | Latest version | One or more valid updates applied |
| Revoked | `true` | `id` only | Terminal on the accepted branch; later evidence may replace that branch |