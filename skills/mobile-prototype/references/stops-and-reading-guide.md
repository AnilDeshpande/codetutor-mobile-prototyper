# Stops and the reading guide

The work pauses for the user only at these stops. At each one, finish the current phase's files,
then end your turn.

| Stop | After | The user reads, in this order | The user is asked to |
|---|---|---|---|
| Inputs | Phase 1, before any file is created | the availability table in chat | choose the prototype folder (recommended: `docs/prototypes`); confirm the documents and the platform suggestion |
| Gate A | Phase 2 | the proposals table in chat → `notes/CLARIFICATIONS.md` for detail → `notes/INPUTS.md` only to check a citation | approve all, or correct by ID; choose the sketch style |
| Gate B | each Phase 3 round (only if C/D items exist) | the questions in chat | answer them |
| Gate C | Phase 4 | `flow.drawio`, screen by screen in S-number order → the list of assumptions in chat | lock the flow, or say what to change |
| D1 / D2 | Phase 5 | `look/style-tile.html` → `look/screens.html` → `notes/DESIGN.md` | pick a direction / approve the look |
| Handoff | Phase 6 | `HANDOFF.md` | nothing: the work is done |

## At every stop

1. Update `docs/prototypes/README.md` (template: `assets/templates/README.md`). Fill in *Where we are*
   and *Read now* for this stop, and add a row to *All files* for each file created since the
   last stop. Mark every file **you** (to read now), **reference** (open it only to check
   something) or **agent** (working notes, such as `STATE.md` — the user never needs to read
   them).
2. Record the stop in `STATE.md` (*Waiting on user*).
3. End the chat message with the reading guide, kept this short:

   ```
   Created: 6 files in docs/prototypes/ — start with docs/prototypes/README.md.
   To review now:
   1. The table above (2 min) — everything you need to decide is in it.
   2. notes/CLARIFICATIONS.md (optional, 5 min) — the evidence behind each proposal.
   Reference only: notes/INPUTS.md (check a citation), notes/DECISIONS.md (what's agreed).
   Agent notes, no need to read: notes/STATE.md, flow.json.
   ```

   Put everything the user must decide in the message itself; files are for detail. Don't list a
   file the user doesn't need at this stop under *To review now*.

The Inputs stop comes before the workspace exists, so it has no `README.md` or `STATE.md` to
update: the chat message is the whole stop.
