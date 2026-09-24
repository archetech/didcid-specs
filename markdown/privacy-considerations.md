## Privacy Considerations

This section addresses the privacy implications of the `did:cid` method in accordance with [[ref: DID-CORE]] Section 10 and applicable W3C privacy guidelines.

---

### Distribution and Retention

Non-local creation operations and subsequent changes are distributed through Hyperswarm gossip. Peers retain copies; IPFS provides an additional retrieval path. This has fundamental privacy implications:

- **Potentially lasting disclosure**: Once distributed, an operation may be retained indefinitely by peers or other recipients. Neither gossip nor IPFS guarantees permanent availability.
- **No guaranteed erasure**: Removing a local record or unpinning IPFS content cannot remove copies held by other parties. Content addressing detects changed content; it does not itself prevent every copy from being deleted.
- **Public distribution**: Treat non-local operations as public once shared. Local-only DIDs are not queued for gossip, but local handling is not an encryption mechanism or a guarantee against disclosure through other storage or service access.

Implementations MUST NOT include sensitive personal data in the creation operation beyond what is required for DID function (the public key and registration metadata).

---

### Public DID Resolution

All `did:cid` DID documents are publicly resolvable by any party with access to a node. The full contents of `didDocument`, `didDocumentData`, and `didDocumentRegistration` are visible to any resolver without authentication.

Implementations MUST NOT store unencrypted sensitive personal information in `didDocumentData`. Data that must be associated with a DID but kept private SHOULD be stored in an encrypted form — either as an identity backup asset or within a [[ref: vault]] — so that it is visible as ciphertext to resolvers but inaccessible without the appropriate key.

---

### DID Manifest and Selective Disclosure

The [[ref: DID Manifest]] provides a mechanism for agents to voluntarily publish [[ref: verifiable credential, verifiable credentials]] publicly. Manifest usage is entirely opt-in — no credentials appear in the manifest unless the controller explicitly adds them.

Agents have two disclosure modes available:

- **Publish** (existence-only): Announces that the agent holds a credential without revealing its content. This supports selective disclosure at the presentation layer — a verifier can request presentation of the credential without being able to read it from the DID document.
- **Reveal** (full data): Makes the complete credential, including all claims and the cryptographic proof, publicly readable by any resolver.

::: warning
Once a credential is revealed in the manifest and the corresponding update operation is confirmed on the [[ref: registry]], the credential becomes part of the permanent update history. Removing the credential from the manifest via `unpublish` removes it from the **current** DID document but does not affect historical versions, which remain resolvable via [[ref: temporal resolution]]. Agents MUST carefully consider the permanent nature of credential revelation before using the reveal mode.
:::

---

### Vaults

A [[ref: vault]] is a shared encrypted file store associated with a group DID. Vault items are accessible to group members via individually derived keys. The `did:cid` method supports two membership configurations with distinct privacy properties:

**Standard membership** — the member list is stored in plaintext within `didDocumentData.group.members`. Membership is publicly visible to any resolver.

**Secret membership** — the member list is encrypted and stored in `didDocumentData.group.encryptedMembers`. Each member receives their own individually derived access key. The following privacy properties hold:
- Resolvers cannot determine who the members are
- Members cannot prove or disprove the membership of other participants
- Items added to the vault do not reveal the identity of the contributor

Secret membership vaults are well suited to use cases that require both shared access and anonymity among participants — such as whistleblower submission systems, blind peer review, and anonymous committees.

::: note
**Identity backup** is a separate mechanism from the Vault. An identity backup is an encrypted asset DID referenced from `didDocumentData.vault`, containing the agent's credentials and relationships encrypted with the agent's own private key. It is a single-controller backup/restore mechanism, not a shared store. See DID Recovery for details.
:::

Both the vault and the identity backup store encrypted data that is publicly visible as ciphertext to any resolver. Neither exposes plaintext content without the appropriate key.

---

### Pseudonymity

`did:cid` DIDs are **pseudonymous by default**. The DID suffix — a CID derived from the creation operation — contains no information about the controller's real-world identity. A freshly resolved DID reveals only:

- That the controller possesses the private key corresponding to the embedded public key
- The controller's chosen [[ref: registry]]

Real-world identity is associated with a DID only when the controller explicitly discloses identifying information — for example, by revealing a name credential in the [[ref: DID Manifest]], or by including identifying data in unencrypted `didDocumentData`. This disclosure is voluntary and controlled entirely by the DID subject.

---

### Correlation Risks

**DID-level correlation**: All activity signed with the same DID is attributable to the same controller by any observer who knows the DID. Controllers who wish to limit correlation across contexts SHOULD use separate DIDs for separate relationships or roles.

**Public key correlation**: The public key embedded in a `did:cid` creation operation is visible to recipients when the operation is distributed, including gossip peers and parties retrieving it through IPFS. Reuse of the same cryptographic key material across multiple DIDs — which is not recommended — would enable correlation across those DIDs even if they are otherwise unrelated.

**Registry transaction patterns**: Update operations recorded on public blockchains are permanently and publicly associated with the DID. The timing, frequency, and size of updates may reveal behavioral patterns even when the content of operations is not sensitive.

**Asset DID linkage**: Every [[ref: asset]] DID contains a `controller` field referencing its controlling [[ref: agent]] DID. This creates a publicly visible, permanent ownership relationship. Applications that create many asset DIDs for a single agent should be aware that the full set of assets controlled by that agent is publicly enumerable by traversing the `controller` references.

---

### Data Minimization

Implementations SHOULD apply the principle of data minimization throughout the DID lifecycle:

- Include only the minimum necessary data in DID creation operations (public key and registry selection).
- Prefer encrypted storage (identity backup or [[ref: vault]]) over plaintext `didDocumentData` for non-public information.
- Use [[ref: DID Manifest]] reveal mode only for credentials explicitly intended for permanent public disclosure.
- Use [[ref: DID Manifest]] publish mode (existence-only) as a privacy-preserving alternative when full credential data need not be public.
- Consider using separate DIDs for contexts where cross-context correlation is undesirable.

---

### Third-Party Privacy

When a `did:cid` node forwards a resolution request to a trusted peer node, the peer node learns the DID being resolved and the network address of the requesting node. This creates a metadata record of resolution activity at the peer node.

Node operators SHOULD:

- Minimize logging of resolution requests and retain logs only for the minimum period required for operational purposes.
- Disclose their data retention and forwarding policies to users.
- Consider supporting transport-layer anonymization (e.g., Tor hidden services) for resolution endpoints used in privacy-sensitive contexts.

Controllers who are concerned about resolution metadata leakage SHOULD run their own node directly connected to the relevant [[ref: registry]], eliminating the need for request forwarding.
