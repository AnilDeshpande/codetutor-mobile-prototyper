# Clarification protocol

How to turn documents plus the question bank into decisions, with the user in control and without
asking them things the documents already answer.

## 1. Classify every question

| Class | Test | Confidence | Next step |
|---|---|---|---|
| **A — Documented** | a document states the answer directly | high | propose, cite the fact IDs |
| **B — Inferred** | the answer follows from one or more facts, but isn't written anywhere | medium | propose as an assumption, one line of reasoning |
| **C — Conflict** | two sources disagree, or a source contradicts a decision already made | — | must ask |
| **D — Open, blocking** | not answered, and the answer changes a journey, a state, navigation or what a screen must contain | — | must ask |
| **E — Open, cosmetic** | not answered, and any reasonable answer gives the same experience | — | decide, record as an assumption |

Rules of thumb:

- If you're choosing between A and B, choose B. If you're choosing between B and D because two
  readings are plausible and they lead to different flows, choose D.
- Architecture facts rarely answer UX questions directly; they usually *create* questions
  (a 5–15 s handshake means someone must decide what the user sees during it). That's D, with the
  architecture fact as evidence.
- Border radius, exact spacing, icon choice, colour shades, wording of secondary labels: E.
  Never ask about these unless the user raised them.

## 2. Record it in `notes/CLARIFICATIONS.md`

```
## N3 — System back during pairing
Class: C (conflict)
Evidence: F14 PRD.md § Pairing "User can leave pairing at any time";
          F13 adr/0003-ble.md "Cancelling mid-handshake leaves the meter locked for 60 s"
Proposal: Confirm before leaving; explain the 60 s lock in the dialog
Status: open → asked round 1 → decided
Decision: Confirm dialog, with the 60 s lock explained (user, round 1)
```

Status values: `proposed` → `approved` / `corrected` (A, B); `open` → `asked round n` →
`decided` / `deferred` (C, D); `assumed` (E). Move each settled item to `DECISIONS.md` with its source:
`document` (approved A), `assumption-approved` (B), `user` (C/D answers), `assumption` (E, and
deferrals), each flagged for review in the handoff.

## 3. Approval gate A — present the proposals

One message, one table, A and B only. Sort by group. Keep each answer to one line.

```
From your documents I can answer these. Approve all, or correct any by ID.

| ID | Question                  | Proposed answer                                  | Source       | Conf. |
|----|---------------------------|--------------------------------------------------|--------------|-------|
| P1 | Primary user & context    | Adults with type 2 diabetes, at home, daily      | F01, F02     | high  |
| J1 | Primary journey           | Add device → permission → scan → pick → pair → first sync | F05–F09 | high |
| S5 | Offline behaviour         | Readings cached; sync queued; banner shown       | F18 (inferred from caching) | medium |

Defaults I'll use unless you object: Material 3 neutral palette (V1), portrait only (A4),
draft copy marked as draft (C1).
```

Then wait. Treat silence or "looks good" as approval of the whole table only if the user clearly
means it; if they correct IDs, update just those.

## 4. Gate B — ask the open questions

- Order: conflicts (C) that block the primary journey, then D items in journey order, then the rest.
- **At most four questions per round.** People answer four well and ten badly.
- Each question has: the evidence (fact IDs, quoted briefly), 2–4 concrete options, your
  recommendation first with a short reason. "Other" is always implicitly allowed.
- Use the host's structured question tool if it has one (Claude Code: `AskUserQuestion`, with the
  recommended option first and labelled "(Recommended)"). Otherwise, a numbered list in chat, and
  invite answers like `1b, 2a, 3: …`.
- After each round: record decisions, re-classify anything the answers affect, add new questions
  the answers raise.
- "You decide" / "not sure" → take your recommendation, record it as `assumption`, flag it.
- After **three rounds**, if non-critical items remain, offer to continue with them as flagged
  assumptions. Never proceed past gate B with an open conflict in the primary journey unless the
  user explicitly says to.

## 5. Questions that come up later

Building and verifying will surface new questions (a state nobody thought about, a flow that
doesn't fit on a screen). Classify them the same way. Class E: decide and record. Class C/D:
batch them and ask at the next natural pause, before building the affected part if it's blocking.
Don't interrupt the user for each one.

## 6. Tone

Talk like a designer who has read everything: specific, brief, showing the evidence. Don't ask
questions whose answers are in the documents; don't make the user re-read their own spec.
