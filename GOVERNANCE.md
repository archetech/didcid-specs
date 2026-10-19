# Governance

This repository is a project under the jurisdiction of the [Archonomicon](https://github.com/archetech/archonomicon), the Archetech Nomicon ([rule 21](https://github.com/archetech/archonomicon#jurisdiction)). The rules of the game are the text of the Archonomicon's default branch (rule 9). This file only points to them. Where it seems to differ from them, the rules prevail (rule 24). Rules are cited by their permanent numbers (rule 26).

## What it means for this repository

**This specification defines the protocol.** The `did:cid` protocol is defined by this specification, and every implementation in the projects under jurisdiction must conform to it (rule 42). Implementations and their documentation, such as Archon's [description of the method](https://github.com/archetech/archon/blob/main/docs/scheme.md), are evidence of deployed behaviour, not authorities over this text.

**Differences are defects.** A difference between an implementation and this specification, or between two implementations, is corrected in the implementation, unless this specification is silent or in error, in which case it is corrected here first (rule 43). Behaviour that affects which operations are accepted or how a DID resolves, and that this specification does not describe, must be described here with a test vector or removed from the implementation (rule 44).

**Protocol changes are made here.** A change to the protocol is made by changing this specification (rule 45):

- It is *Proposed* once this specification describes it and references signed test vectors for it, published in a project under jurisdiction, and every implementation that accepts operations or resolves DIDs passes them.
- It is *Deployed* once every such implementation has released it and run it on the live network without diverging.
- The status of each change is recorded under *Change Status* in [`protocol-rules.md`](markdown/protocol-rules.md).

A protocol change must not change the result of any history the network has accepted. The evidence for each change is recorded here: that this holds by construction, or an audit of retained histories stating which histories it covered (rule 46). Correcting this specification where it misdescribes behaviour that every implementation shares is not a protocol change, unless it alters an accepted history (rule 47).

**Proved properties.** This specification states each formally proved property, with the proof's assumptions and a reference to the proof (rule 48), under *Formally Proved Properties* in `protocol-rules.md`. A change that affects such a property is not Proposed until the proof has been updated and still checks, unless this specification records that the change gives up or narrows the property (rule 49).

**Editorial changes.** Wording, structure, examples and tooling change by pull request to this repository. Those changes are not rule changes, but they must comply with the rules (rule 23).

**Security.** Report vulnerabilities in the `did:cid` protocol or in an implementation of it through Archon's [private vulnerability reporting](https://github.com/archetech/archon/security/advisories/new) (rule 52). Within 30 days of an emergency fix released under rule 53, this specification must describe the fix, with test vectors and its status, and record its effect on accepted histories (rule 55).

## Who decides

Anyone may submit a proposal: a pull request to the [Archonomicon repository](https://github.com/archetech/archonomicon) that adds, amends or repeals rules (rules 10 and 11). The players and the Operator are listed in [players.md](https://github.com/archetech/archonomicon/blob/master/players.md), and the rules say how proposals are agreed, objected to and adopted (rules 12 to 16, 37 and 38).
