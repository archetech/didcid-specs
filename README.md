# did:cid Method Specification

Source for the **`did:cid` DID Method Specification**, a W3C-style standards document built with
[DIF Spec-Up](https://github.com/decentralized-identity/spec-up).

**Published spec:** <https://archetech.com/didcid-specs/>

`did:cid` is a DID method optimized for fast, virtually costless identity creation: a DID is
created without a central registrar or registry transaction. Archon distributes creation, update, and deletion
operations through Hyperswarm gossip, except for DIDs using the `local` registry; IPFS provides fallback content retrieval. The chosen
registry (BTC, ETH, hyperswarm, …) determines confirmation and ordering of the operation history. The DID suffix is the CIDv1-base32 of the
JCS-canonicalized seed document, so identifiers are self-certifying and seeds are immutable by
construction. The method is implemented in the [Archon](https://github.com/archetech/archon)
project; this repository specifies the protocol and contains no application code.

## Repository layout

| Path | Purpose |
|---|---|
| `markdown/` | The specification itself, one file per major section |
| `specs.json` | Spec-Up config — **section order**, title, external spec links |
| `render.js` | Three-line wrapper that invokes spec-up |
| `.github/workflows/pages.yml` | Renders on every PR; publishes to GitHub Pages on push to `main` |
| `.github/scripts/check-refs.js` | Fails CI on a `[[ref:]]` with no matching `[[def:]]` |
| `build/` | Render output (gitignored — never commit or hand-edit) |

## Building

```bash
npm install
npm run render    # one-shot build: markdown/ -> build/index.html (alias: npm run build)
npm run edit      # spec-up in watch mode; rebuilds on save
```

> [!WARNING]
> **On the host that serves `https://archon.technology/specs`, rendering is a production deploy.**
> nginx serves `build/index.html` directly out of that working tree — there is no staging step and
> no atomic swap, so `npm run render` overwrites the live file in place and `npm run edit` does it
> on every save. Check `git status` first; whatever is in `markdown/` at render time goes live.
> Because `build/` is gitignored, a render can also put content on the live site that exists in no
> commit — commit the source after any deliberate publish. On any other checkout these commands are
> harmless.

There is no test suite and no linter. CI is the closest thing to both.

## Publishing

Two independent surfaces, and they can drift:

- **GitHub Pages** — <https://archetech.com/didcid-specs/>. Updated automatically by
  `.github/workflows/pages.yml` on every push to `main` (i.e. every PR merge), and manually via
  *Actions → Render and publish spec → Run workflow*. The same workflow renders every pull request
  and runs the reference check on it, but skips the deploy job — so a broken `[[ref:]]` fails review
  rather than the post-merge publish.
- **archon.technology** — <https://archon.technology/specs>. Updated only by running `npm run render`
  on the hosting checkout, as described above. A merge to `main` does **not** update it.

## Reading the build output

`npm run render` **always exits 0**, so success is judged by its stdout, not the exit code:

- **`Unresolved References`** — a `[[ref: X]]` with no matching `[[def: X]]` anywhere in `markdown/`.
  Entries naming an `external_specs` key from `specs.json` (currently `DID-CORE`, `VC-DATA-MODEL`,
  `CID`) are expected and benign; they are satisfied by the external link rather than a local def.
  **Any other name is a broken reference** and renders as a dead link. CI enforces exactly this
  distinction — see `.github/scripts/check-refs.js`.
- **`Dangling Definitions`** — a `[[def: X]]` that nothing ever references. Usually harmless (terms
  defined for the glossary), but a new entry can also mean a `[[ref:]]` was misspelled. Advisory
  only; CI does not fail on these.

## Authoring conventions

- **Section order lives in `specs.json`, not the filesystem.** `markdown_paths` is an explicit
  ordered list — a new file in `markdown/` is invisible to the build until it is added there.
- **Define a term once, reference it everywhere.** First mention:
  `[[def: term, The definition sentence]]`. Later mentions: `[[ref: term]]`. For different display
  text (plurals, capitalization) use `[[ref: term, Terms]]` — the first argument must match the def
  exactly.
- **Admonitions** use `::: note` / `::: warning` fenced blocks.
- **Mermaid** diagrams and **KaTeX** both render, but prefer prose unless a diagram carries real
  weight.
- Match the existing register: normative RFC 2119-style language, tables for field definitions, and
  a JSON example for every operation type.

## Concepts worth knowing before editing

- **Creation, distribution, and anchoring are distinct.** A DID is derived from its signed
  creation operation. Hyperswarm gossip distributes creation, update, and deletion operations, except for
  DIDs using the `local` registry; IPFS provides fallback retrieval when content is missing locally. The registry
  in the accepted predecessor determines confirmation and ordering, not the distribution channel.
- **Agent vs. asset.** Agents hold keys and control their own document; assets are
  controlled by exactly one agent. Most rules in `creation.md`, `update.md`, and `resolution.md` fork
  on this distinction.
- **Resolved documents are computed, not stored.** Resolution replays the operation chain; temporal
  resolution replays it to a past point. The DID document is never something "fetched".
- **Archon extensions are normative, and live outside the resolution result.**
  `didDocumentRegistration`, `didDocumentData`, and the agent/asset distinction are method-defined
  additions to the DID Core data model, documented in `archon-extensions.md`. They are *not* members
  of the DID resolution result (the `didDocument` / `didResolutionMetadata` / `didDocumentMetadata`
  triple); each is retrieved by dereferencing a DID URL — `/registration` and `/data` — which this
  method specifies normatively, per `dereferencing.md`. That separation is what keeps the resolution
  result conformant while the extensions remain binding on implementations, and it matters because
  this document targets W3C DID method registration.
- **Resolution ≠ dereferencing.** Resolution returns the document and its metadata; dereferencing
  returns a resource at a DID URL path (`/data`, `/registration`). Fragments resolve client-side.

Ground normative claims about resolver behaviour in the shipped implementation
([`archetech/archon`](https://github.com/archetech/archon), `docs/scheme.md`) rather than older
drafts of this spec. Where the documents disagree, the code and its tests win.

## Protocol baseline and checks

The version-1 reconciliation targets Archon commit `bdc57d7f1d1c750e2f545dd465a1c5f10c96b7cc`
(v0.13 release preparation). `markdown/protocol-rules.md` consolidates acceptance,
receipt ordering, authorization, and replay rules from `docs/scheme.md`, the
Gatekeeper implementations, and their signed convergence fixtures. See
[Archon's protocol documentation](https://github.com/archetech/archon/blob/bdc57d7f1d1c750e2f545dd465a1c5f10c96b7cc/docs/scheme.md)
and [convergence completion report](https://github.com/archetech/archon/blob/bdc57d7f1d1c750e2f545dd465a1c5f10c96b7cc/docs/plans/protocol-convergence-completion.md).

The four operation examples are a connected sequence: agent creation, asset
creation, agent rotation, and asset deletion by the rotated key. Synthetic keys
are public test material. With a built Archon checkout, validate the examples:

```bash
node .github/scripts/check-examples.mjs ../archon
```

This uses only in-memory storage and does not connect to a running node. Rendering
checks should run in an isolated copy with a temporary output directory, never
against the checkout that serves the live spec.
