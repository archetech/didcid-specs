# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repository contains **no application code**. It is the source for the `did:cid` DID Method Specification — a W3C-style standards document built with [DIF Spec-Up](https://github.com/decentralized-identity/spec-up). The only "code" is `render.js`, a three-line wrapper that invokes spec-up.

The specified method (`did:cid`) is implemented elsewhere, in the Archon project (`github.com/archetech/archon`). Changes here describe the protocol; they do not change any running system. Treat the prose as the deliverable.

## Commands

```bash
npm run render    # one-shot build: markdown/ -> build/index.html (alias: npm run build)
npm run edit      # spec-up in watch mode; rebuilds on save
```

### Building publishes to production — read this before running either command

On the server that hosts this checkout, nginx serves `https://archon.technology/specs` **directly from this working tree**:

```nginx
location /specs {
    alias /var/www/didcid-specs/build/index.html;   # the exact file `npm run render` writes
}
```

There is no staging step, no separate deploy, and no atomic swap — `npm run render` overwrites the live file in place, and `npm run edit` does it on every keystroke. Consequences worth internalizing:

- **Rendering to "check the build" is a production deploy.** Never run either command as a casual verification step. If you only need to validate references, expect the publish and confirm the working tree holds content you would be willing to serve.
- **Whatever is in `markdown/` at render time goes live**, including a dirty working tree or a half-finished section. Check `git status` first.
- **`build/` is gitignored**, so a render can put content on the live site that exists in no commit. After deliberately publishing, make sure the source is committed — otherwise the live spec cannot be reproduced from git.
- Confirm what actually shipped with `curl -s -o /dev/null -w '%{http_code} %{size_download}' https://archon.technology/specs` and compare the byte count to `build/index.html`.

There is no test suite and no linter. `npm run render` is the closest thing to both — but it is also the deploy, so read the next section before treating it as a check.

## The build output is the lint

`npm run render` always exits 0, so success is judged by reading its stdout, not the exit code:

- **`Unresolved References`** — a `[[ref: X]]` with no matching `[[def: X]]` anywhere in `markdown/`. Entries that name an `external_specs` key from `specs.json` (currently `DID-CORE`, `CID`) are expected and benign; they are satisfied by the external link, not a local def. Any *other* name in this list is a real broken reference and will render as a broken link — treat it as a build failure even though the exit code is 0.
- **`Dangling Definitions`** — a `[[def: X]]` that nothing ever `[[ref:]]`s. Mostly harmless (terms defined for the glossary), but a long-standing entry can also mean a ref was misspelled.

Check this output after editing terminology. Adding a `[[ref:]]` for a term you didn't define will silently render as a broken link in `build/index.html`.

## Spec-Up authoring conventions

- **Section order lives in `specs.json`, not the filesystem.** `markdown_paths` is an explicit ordered list — a new file in `markdown/` is invisible to the build until it is added there.
- **Define a term once, reference it everywhere.** First mention: `[[def: term, The definition sentence]]`. All later mentions: `[[ref: term]]`. To reference with different display text (plurals, capitalization), use `[[ref: term, Terms]]` — the first argument must match the def exactly.
- **Admonitions** use `::: note` / `::: warning` fenced blocks. Both are already used; don't introduce other container types without checking they render.
- **Mermaid** (` ```mermaid `) and **KaTeX** (enabled via `"katex": true`) both render. Note that a prior commit removed a diagram in favor of prose — prefer prose unless a diagram carries real weight.
- `build/` is gitignored. Never commit it; never hand-edit `build/index.html`.

## Editing the spec

Normative content sits in `markdown/`, one file per major section. The load-bearing concepts, worth knowing before editing any of them:

- **Creation is on IPFS, updates are on a registry.** The DID suffix is the CIDv1-base32 of the JCS-canonicalized seed document, so the identifier is self-certifying and the seed is immutable by construction — a changed seed is a *different DID*. Mutations are expressed only as signed update operations recorded on the registry named in `didDocumentRegistration.registry`. This split (IPFS for creation, pluggable registry for updates) is the method's central claim; statements that blur it are bugs.
- **Agent vs. asset.** Agents hold keys and control their own document; assets are controlled by exactly one agent. Most rules in `creation.md`, `update.md`, and `resolution.md` fork on this distinction, and it constrains other sections — e.g. it is why `recovery.md` has no multi-sig path.
- **Resolved documents are computed, not stored.** Resolution replays the operation chain; temporal resolution replays it to a past point. Don't describe the DID document as something fetched.
- **Archon extensions are normative, and live outside the resolution result.** `didDocumentRegistration`, `didDocumentData`, and the agent/asset distinction are method-defined additions to the DID Core data model, documented in `archon-extensions.md`. They are *not* members of the DID resolution result (the `didDocument` / `didResolutionMetadata` / `didDocumentMetadata` triple); each is retrieved by dereferencing a DID URL — `/registration` and `/data` — which this method specifies normatively, per `dereferencing.md`. That separation is what keeps the resolution result conformant while the extensions stay binding on implementations. Do not describe them as non-normative, and do not describe them as inline members of the resolved document.
- **Two surfaces: conformant vs. legacy.** This is the distinction most recent review churn has turned on, and the easiest thing to get wrong. The conformant `/1.0/identifiers` surface returns only the DID Core triple (`didDocument` / `didResolutionMetadata` / `didDocumentMetadata`) and always reflects confirmed, cryptographically verified state. The legacy `/api/v1/did/<did>` endpoint returns the richer internal document set inline and may return unconfirmed state. Three specifics that were each corrected in review, and are worth re-checking before you touch a JSON example:
  - `confirmed` and `timestamp` are method-specific anchoring provenance, **not** DID Core document metadata. The conformant surface strips them from `didDocumentMetadata` and returns them with the `/registration` resource; only the legacy endpoint carries them inline.
  - `didResolutionMetadata` carries `contentType` on the conformant surface, **not** `retrieved`. `retrieved` is legacy-only and any mention should say so.
  - `/data` dereferences raw, but `/registration` is **augmented** with `confirmed` and (blockchain registries only) `timestamp`.
- **Resolution and dereferencing are different operations.** Resolution returns the document and its metadata; dereferencing returns a resource at a DID URL path (`/data`, `/registration`), per `dereferencing.md`. Fragments resolve client-side against the resolved document.

Ground normative claims about resolver behavior in the shipped implementation (`archetech/archon`, `docs/scheme.md`), not in older drafts of this spec. `scheme.md` has itself lagged the code — the last review round found three errors faithfully copied from a stale `scheme.md`, and the fix was to port from the corrected upstream. When these documents disagree, the code and its tests win.

The commit history shows this spec is actively revised against external review (W3C registration requirements, Codex review passes, review from `macterra` against the shipped resolver). Match the existing register: normative RFC 2119-style language, tables for field definitions, JSON examples for every operation type.

## Protocol reconciliation discipline

- Reconcile procedural checklists, diagrams, examples, and security claims together; adding a rule table does not repair contradictory older prose.
- Keep credential proof-time verification distinct from DID operation predecessor/chain-position authorization. Signed timestamps are claims, not trusted signing-time attestations; legacy credential acceptance remains intentional.
- Validate changed signed examples against a built Archon checkout with `.github/scripts/check-examples.mjs`. Do not change proof labels or document fields without regenerating signatures and CIDs.
- Render in an isolated temporary copy for PR validation, preserving the live output. Preserve the DID Core presentation separately from the internal Gatekeeper document set and genesis retrieval API.

- Describe assets through their owning agent’s authority. Do not elevate incidental accepted data, such as published keys, into a separate asset feature or imply a blanket prohibition on that content.
