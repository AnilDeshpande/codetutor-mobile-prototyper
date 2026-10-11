# Clarifications

Every question about the product, the answer proposed from the documents, and what was decided.
The questions and their IDs come from the skill's question bank (see *Sources*); the answers and
decisions are this project's.

Classes: A documented · B inferred · C conflict · D open, blocking · E open, cosmetic.
Status: proposed → approved / corrected (A, B) · open → asked round n → decided / deferred (C, D) · assumed (E).

## How to read the IDs

A question ID is a group letter and a number, such as `P1` or `J3`.

| Prefix | Group |
|---|---|
| P | Product and scope |
| J | Journeys |
| N | Navigation and structure |
| S | States and data |
| A | Access and platform |
| T | Technical constraints that change the experience |
| C | Content |
| V | Visual direction |
| X | Accessibility and compliance |

- **The number** identifies the question within its group. It is not a priority: `P1` is the
  first Product and scope question in the question bank, not the most important one.
- **Grouped and ranged IDs**: `P1/P2` is questions P1 and P2, answered together; `J1–J3` is J1,
  J2 and J3.
- **Where they come from**: the IDs and the questions are the skill's question bank, the same in
  every project. A question this project added takes the next free number in its group (for
  example `S8`) and is marked *added* in the summary. The answers, classes and decisions are this
  project's.
- **Not to be confused with**:
  - the *Class* column (A–E), which says where an answer came from: class A is "documented",
    not the Access group;
  - frame numbers S1, S2, … on the sketch (`flow.drawio`) and in the handoff, which number screen
    states. In this file `S1` is always the States and data question; a frame is written
    "frame S1";
  - fact IDs F01, F02, …, which cite the fact register in `notes/INPUTS.md`.

## Summary

| ID | Question | Class | Status |
|---|---|---|---|

## Items

<!-- One section per item:

## N3 — System back during pairing
Class: C
Evidence: F14 PRD.md § Pairing "…"; F13 adr/0003-ble.md "…"
Proposal: …
Status: open
Decision:
-->

## Sources

The conventions in this file are the skill's; the answers and decisions are this project's.

| Convention | Defined in |
|---|---|
| Question IDs, groups and the full questions | {{REF:references/question-bank.md|Question bank}} |
| Classes A–E, status values, how a decision is recorded | {{REF:references/clarification-protocol.md|Clarification protocol}} |
| Fact IDs (F01, …) | [`notes/INPUTS.md`](INPUTS.md), this project's fact register |
