# Document intake

How to find, confirm, read and register the user's documents (Phase 1).

## Categories

| Category | Typical names / signals | What to extract |
|---|---|---|
| **Spec** | PRD, spec, requirements, user stories, feature brief, BRD, acceptance criteria | users and context, goals, features in scope and out of scope, journeys, business rules, acceptance criteria, success metrics, edge cases they already thought about |
| **Architecture** | ARCHITECTURE, ADR-*, system design, tech design, HLD/LLD, data flow, sequence diagrams | anything that changes behaviour the user sees: latency, offline/caching, sync, background work, auth/session, limits (one connection, page sizes, rate limits), failure modes, data freshness, platform constraints |
| **Design** | UX, UI, wireframes, mockups, flows, style guide, brand, design system, screenshots, Figma links | screens and flows already drawn, visual direction, brand colours and type, components they expect, tone of voice |
| **API** | OpenAPI/Swagger, GraphQL schema, proto, API.md, contracts | entities and fields (for realistic mock data), error codes (for error states), pagination, which calls are slow |
| **Other** | research notes, analytics, support tickets, competitor screenshots, regulatory notes | constraints and evidence; treat as supporting, never authoritative unless the user says so |

`scripts/discover-inputs.mjs` classifies by file name, folder and the first headings of text files.
It is a starting point: the user confirms the final list.

## Platform signals

The same script reports which platform(s) the project points to, from build files
(`AndroidManifest.xml` and Android Gradle files → Android; `.xcodeproj`, `Package.swift`,
`Podfile` → iOS; Kotlin Multiplatform, Flutter or React Native → both) and from what the spec,
architecture and design documents mention ("Jetpack Compose", "SwiftUI", "iPhone"…). It prints a
suggestion. Treat it like any document fact: record it (for example `F03 | Architecture names
Android Companion Device Manager | ARCHITECTURE.md § Connectivity | Arch`) and propose the answer
to **P5** in Phase 2 with those citations. Signals that disagree (an Android codebase and a PRD
that promises an iPhone app) are class C. No signals at all means P5 is class D: ask.

## The availability table

Show it like this and ask for confirmation in the same message:

```
Inputs found
  Spec          ✔ docs/PRD.md (4,200 words)
  Architecture  ✔ docs/ARCHITECTURE.md, docs/adr/0003-ble.md
  Design        ~ design/onboarding.png, design/home.png (images only — no written flows)
  API           ✗ none found
  Other         docs/research/interviews.md
  Platform      Android suggested — ARCHITECTURE.md mentions "Android Companion Device Manager"

Please confirm: are these the authoritative versions? Anything to ignore, or
anything missing (another folder, a Figma link, an API contract)?
```

Use ✔ (found), ~ (partial), ✗ (none).

## When something is missing

| Missing | Consequence | What to do |
|---|---|---|
| Spec | nothing defines the product | ask the user for a short written description of the feature, its users and its main journey; write it to `notes/INPUTS.md` as the working spec and get it approved before Phase 2 |
| Architecture | behaviour under latency, offline and failure is unknown | move question-bank topics T1–T5 and S3–S7 into Phase 3 (usually class D) |
| Design | no visual direction | nothing to do for the sketch, which is deliberately plain; record it as class E. The look is settled in the optional design phase, starting from the platform baseline (Material 3 neutral palette; iOS system colours with a neutral tint) |
| API | mock data must be invented | derive entities from the spec; make mock data realistic (real-looking names, dates, units, lengths); record it as an assumption |

## Reading rules

- Read each confirmed document **in full**. For long documents, read section by section; don't
  stop at the summary.
- Look at every image: note screens, flows, components, colours, text you can read.
- For a Figma link: if a Figma tool is available in the session, use it; otherwise ask the user
  for exported frames or screenshots. Don't guess from the link.
- PDFs and .docx: use whatever PDF or document-reading ability the agent has; if none, ask the user
  for a text or Markdown export.
- Note each document's date or version if it has one. Newer documents usually win, but a
  disagreement is still a class C item: don't settle it silently.

## Fact register (in `notes/INPUTS.md`)

One row per fact that could matter to the experience. Keep facts atomic and quote short phrases.

```
| ID  | Fact                                                         | Source                                   | Cat |
|-----|--------------------------------------------------------------|------------------------------------------|-----|
| F07 | Users can register up to 3 meters                            | PRD.md § Device management               | Spec |
| F12 | Only one active BLE connection at a time                     | ARCHITECTURE.md § Connectivity           | Arch |
| F13 | Pairing handshake takes 5–15 s                               | adr/0003-ble.md § Consequences           | Arch |
| F21 | Primary colour #0B6E4F, Inter typeface                       | design/brand.md                          | Design |
```

Every proposal in Phase 2 cites fact IDs, so the user can check the source quickly.
