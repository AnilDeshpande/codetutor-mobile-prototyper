# Question bank

The questions a prototype needs answered. Work through the groups in order; skip questions that
are out of scope for the feature being prototyped. For each one, try to answer it from the fact
register first (Phase 2), and ask the user only if it remains class C or D (Phase 3).

"Blocking" is the default impact if nothing in the documents answers it; judge each case. The
"default" column is what to use, and record as class E, when a non-blocking question stays open.

## P — Product and scope

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| P1 | Who is the primary user, and in what situation do they use this (at home, on the move, one-handed, under stress)? | yes | — |
| P2 | What is the user trying to get done in this feature, in one sentence? | yes | — |
| P3 | Which feature, journeys and screens are in scope for *this* prototype, and what is explicitly out? | yes | — |
| P4 | How will we know the experience works (task completed, time, errors avoided)? | no | "the primary journey completes without help" |
| P5 | Which platforms does this prototype target: Android, iOS or both? | yes | — (propose from the documents and the project's build files; never assume both) |
| P6 | How should the sketch be laid out: a **wireflow** (every screen and arrow on one page), **click-through** (a map, then one page per screen with clickable buttons), or both? | no, but always ask: it is the user's preference | wireflow |

## J — Journeys

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| J1 | What are the steps of the primary journey, from entry to done? | yes | — |
| J2 | Where does the user enter it (app launch, a tab, a notification, a deep link)? | yes | from the relevant top-level destination |
| J3 | What does "done" look like, and where does the user land afterwards? | yes | — |
| J4 | Which secondary journeys are in scope (edit, delete, retry, cancel, undo)? | depends | cancel and retry only |
| J5 | Is there a first-run or onboarding version of the journey? | depends | no separate first run |

## N — Navigation and structure

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| N1 | What are the top-level destinations of the app (bottom navigation on Android, tabs on iOS)? | yes if more than one screen | derive from the spec; 3–5 items |
| N2 | Which screens sit inside which destination's stack? | no | derive from journeys |
| N3 | What happens on back (Android system back; iOS back button, edge swipe, Cancel in a modal) at each step of the primary journey, especially mid-task (discard, confirm, save draft)? | yes for multi-step tasks | confirm before discarding user input |
| N4 | Can users arrive from a notification or a link directly into a deep screen? | no | no |

## S — States and data

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| S1 | What information does each screen show, and what is most important on it? | yes | — |
| S2 | What does the user see when there is no data yet (empty state), and what action does it offer? | yes | explain + one primary action |
| S3 | How long can loading take, and should the user be able to act meanwhile? | depends | progress indicator after 300 ms |
| S4 | What can fail, what does the user see, and how do they recover? | yes | message + retry |
| S5 | What works offline, and what does the user see when offline? | yes if the product has connectivity | cached content with an offline notice; actions disabled with reason |
| S6 | Can data be stale or out of sync, and does the user need to know? | depends | show "last updated" time |
| S7 | Can an operation partly succeed (for example, saved on the device but not on the server)? | yes if the architecture allows it | — |

## A — Access and platform

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| A1 | Is sign-in part of this prototype, or do we assume a signed-in user? | yes | assume signed in |
| A2 | Which runtime permissions are needed (Bluetooth, location, notifications, camera…), when are they asked, and what happens if the user denies them, including "don't ask again"? On iOS, what is each purpose string? | yes if any are needed | rationale → system prompt; Android: denied → explain + retry, permanently denied → settings; iOS: one denial is final → explain + Open Settings |
| A3 | Which form factors are in scope: phones only, or also tablets and foldables (iPad on iOS)? | no | phones primary; check tablet layouts don't break |
| A4 | Portrait only, or landscape too? | no | portrait |
| A5 | Minimum OS versions (Android API level, iOS version)? They decide which generation of the platform's design language applies. | no | current versions: Material 3 on Android; Liquid Glass-era iOS (26+) |

## T — Technical constraints that change the experience

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| T1 | Which operations are slow, and how slow (ranges)? | depends | — |
| T2 | Does anything continue in the background, and how does the user find out it finished (notification, badge)? | depends | — |
| T3 | Are there limits the user can hit (one connection at a time, a maximum count, size, rate limits)? | yes if any exist | — |
| T4 | How fresh does data have to be, and how does refresh work (pull to refresh, automatic)? | no | pull to refresh |
| T5 | Are there hard rules from the backend that the UI must enforce (validation, ordering, idempotency)? | depends | — |

## C — Content

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| C1 | Is there approved copy, or should the prototype draft it? | no | draft realistic copy, flag it as draft |
| C2 | Languages, right-to-left support, long translations? | no | English; check one long-string case |
| C3 | Units, number, date and time formats? | no | from the spec's locale, else en-US |
| C4 | Is any data sensitive (health, money, personal)? Masking, consent or disclaimer wording? | yes if regulated | — |

## V — Visual direction

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| V1 | Brand colours, typeface, logo? | no | none in the sketch, which is deliberately plain. Record a documented brand colour or typeface as a decision; it is used in the optional design phase |
| V2 | An existing app or screens to stay consistent with? | no | none |
| V3 | Is dark theme in scope? | no | yes: the design phase shows both themes |
| V4 | Information density: compact and data-heavy, or airy and guided? | no | from P1 (stressful context → guided) |

## X — Accessibility and compliance

| ID | Question | Blocking | Default if open |
|---|---|---|---|
| X1 | Any accessibility commitments beyond the platform baseline (large text, screen reader first, colour-blind safe charts)? | no | platform baseline: 48 dp (Android) / 44 pt (iOS) targets, 4.5:1 text contrast, labels on every control, works at 200 % font scale (Android) / the largest Dynamic Type size (iOS) |
| X2 | Regulatory requirements that change the UI (medical device wording, financial disclosures, consent flows, data export)? | yes if a regulated domain | — |

## Adding questions

A document or answer often raises something not in this bank: a business rule, an edge case, a
domain-specific state. Add it to `CLARIFICATIONS.md` with the next free ID in the most fitting
group (for example `S8`), and classify it like any other.
