# The flow spec (`docs/prototypes/flow.json`)

One file describes the whole prototype. `scripts/sketch.mjs` draws it as a draw.io sketch, and
the optional design phase (`scripts/screens.mjs`) renders the same frames in the final look. You
write the spec; the scripts do the drawing, the numbering, the layout and the arrow routes.

```json
{
  "app": "Glucose Companion",
  "platforms": ["android"],
  "appScreens": {
    "devices": { "name": "Devices", "purpose": "See paired meters and add one." },
    "pairing": { "name": "Add device", "purpose": "Find a meter nearby and pair it.", "location": "Devices → Add device" },
    "readings": { "name": "Readings" }
  },
  "tabs": [
    { "label": "Readings", "screen": "readings", "icon": "list" },
    { "label": "Devices", "screen": "devices", "icon": "bluetooth" }
  ],
  "journeys": [
    {
      "id": "pair-meter",
      "title": "Pair a meter",
      "screens": [
        { "id": "devices-empty", "screen": "devices", "state": "empty", "stateName": "None paired", "entry": "First launch",
          "elements": [
            { "type": "bar", "text": "Devices" },
            { "type": "empty", "title": "No meter paired", "text": "Pair your meter to sync readings.",
              "action": { "text": "Add device", "key": "add" } }
          ] },
        { "id": "cancel-pairing", "screen": "pairing", "state": "confirm-cancel", "stateName": "Stop pairing?",
          "below": "pairing-scan",
          "note": "iOS: an alert with the same two actions.",
          "elements": [
            { "type": "dialog", "title": "Stop pairing?", "text": "The meter locks for 60 seconds.",
              "actions": [ { "text": "Keep pairing", "key": "keep" }, { "text": "Stop", "key": "stop", "variant": "danger" } ] }
          ] }
      ],
      "flows": [
        { "from": "devices-empty", "key": "add", "to": "pairing-scan", "label": "tap Add device" }
      ]
    }
  ]
}
```

## Top level

| Field | Meaning |
|---|---|
| `app` | the app's name |
| `platforms` | `["android"]`, `["ios"]` or both; the approved P5 decision. Used by the design phase |
| `appScreens` | every app screen, by id: its canonical `name` (required), and optionally its `purpose` (one line, for the handoff) and `location`, where it sits in the app's navigation ("Devices → Add device", "Sheet over Overview"; default: its tab, or the chain of `parent` screens). An entry can be just the name: `"readings": "Readings"`. See *Screen, state and entry condition* |
| `tabs` | optional: the top-level destinations (bottom navigation on Android, tab bar on iOS). Each has a `label`, the `screen` it opens and an optional `icon`. Frames of those screens show the tab strip |
| `journeys` | one per user goal in scope. Each becomes a page (wireflow) or a map plus pages (click-through) |

## Frames (`screens`)

A frame is **one screen in one state**. A screen with an empty state, a content state and an
error dialog is three frames. Frames are numbered S1, S2, … in the order they appear in the file,
so list them in the order the user meets them.

| Field | Meaning |
|---|---|
| `id` | unique in the file, kebab-case; flows refer to it |
| `screen` | the screen this frame belongs to: a key of `appScreens` (`devices`). Frames of the same screen share it |
| `state` | `content`, `empty`, `loading`, `error`, `offline`, or any name that says what it is (`invalid`, `confirm-cancel`, `permission`). Unique per screen |
| `stateName` | optional: the state in words, when the id in words ("Confirm cancel") doesn't say it well: "None paired", "Stop pairing?" |
| `entry` | optional: the entry condition, how or when the user arrives in this state: "First launch", "After saving a habit". Not a screen name and not a state |
| `elements` | what is on the frame, top to bottom (see below) |
| `below` | optional: the `id` of the frame this one hangs under. Use it for branches: a dialog, a sheet, an error or a side path. Frames without `below` form the main path, left to right |
| `over` | optional: for a frame that only holds a dialog or a sheet, the frame whose content is behind it (default: the frame named in `below`). Only the design phase uses it |
| `parent` | optional: the screen that back returns to, when it isn't the first screen |
| `note` | optional: a remark for the reader, such as a platform difference. Shown as a yellow note on the frame; keep it to a line or two |

The frame's title is generated, never written: the screen's name, then the state,
"Add device — Stop pairing?". It heads the frame, names its page and is what the handoff and the
final-look screens show, so each S-number has one name everywhere.

**Layout rules.** Main-path frames sit in one row in file order. A frame with `below` sits one
row under the frame it names, in the same column; a second branch under the same frame goes one
row further down, and a branch can hang under a branch. Keep a journey to about eight main-path
frames; split a longer one into two journeys.

## Screen, state and entry condition

Three things about a frame are kept apart, because mixing them makes one screen look like several:

| | Field | Example | Answers |
|---|---|---|---|
| Screen identity | `screen` → `appScreens.<id>.name` | Overview | *which screen is this?* The same for every frame of it |
| State | `state`, `stateName` | Empty · Populated · Saved | *what is different on it right now?* |
| Entry condition | `entry` | First launch · After saving progress | *how or when did the user get here?* |

- "Empty", "saved", "error" or "first created" are states of a screen, not screens: Overview in
  its empty state is `"screen": "overview", "state": "empty"`, not a screen called "Overview
  empty".
- "First launch" is an entry condition: it goes in `entry` of the frame the user sees then, never
  in a name.
- A dialog or sheet is a state of the screen it belongs to (`"state": "confirm-discard"`), unless
  it is a screen of its own the app navigates to.
- Names are unique: two screens can't share one, and a frame can't override it.

The diagram shows the screen's name in bold at the top of the frame, the state under it, and the
entry condition, if any, under that. Each frame also carries its S-number, screen and state as
shape data (draw.io: *Edit Data*), which `handoff.mjs --check` reads back.

`sketch.mjs --check` fails when a frame's screen isn't in `appScreens`, two screens share a name,
or a frame still has a `title` that differs from its screen's name (it says whether to move the
text to `entry` or `stateName`). It warns when a screen's name sounds like a state ("Overview
saved") and when an `appScreens` entry has no frame.

## Elements

Keep texts short: a frame is 230 px wide. Give a control a `key` when a flow starts from it.

| `type` | Fields | Notes |
|---|---|---|
| `bar` | `text`, `back` (true shows ←), `key` | the top bar; first element of a frame |
| `heading` | `text` | a section title |
| `text` | `text`, `align` (`center`) | body text; `\n` starts a new line |
| `field` | `label`, `value`, `helper`, `error`, `key` | a text field; `error` shows it invalid with the message |
| `button` | `text`, `variant` (`primary` default, `secondary`, `text`, `danger`), `key` | one `primary` per frame |
| `list` | `items`: `[{ text, detail, trailing, icon, key }]` | rows; a `key` makes the row a control |
| `card` | `text`, `key` | first line is the title, the rest the detail |
| `switch` | `text`, `on`, `key` | a setting row |
| `chips` | `items`: `["Day", "Week"]`, `active`, `key` | filter chips |
| `image` | `text`, `size` | a placeholder; say what it shows |
| `banner` | `text` | a status that stays until resolved (offline, sync pending) |
| `snackbar` | `text`, `action` | a short confirmation at the bottom |
| `dialog` | `title`, `text`, `actions`: `[{ text, key, variant }]`, `system` (true for an OS permission prompt) | the dismissing action first, the confirming action last |
| `sheet` | `title`, `items`: `[{ text, key, icon }]` | a bottom sheet (Android) / action sheet (iOS) |
| `loading` | `text` | the loading state |
| `empty` | `title`, `text`, `action`: `{ text, key }` | the empty state with its one action |
| `error` | `title`, `text`, `action`: `{ text, key }` | the error state; `action` is the way out (Try again) |
| `fab` | `text`, `key` | the floating primary action (Android); on iOS it becomes a bar button |
| `gap` | `size` | empty space, in px |

## Flows

| Field | Meaning |
|---|---|
| `from`, `to` | frame ids in the same journey. A flow can't go to its own frame: show the result as another state |
| `key` | the control on `from` that triggers it. The arrow starts at that control; without it, at the frame's edge |
| `label` | what the user does or what happens: "tap Save", "Save with an empty name", "Back with changes", "after 30 s". Keep it to a few words; the script wraps it and finds a clear place for it |

Every frame except the first needs at least one flow leading to it.

## Migrating an older flow.json

A spec without `appScreens` (written before it existed) still draws exactly as before: the frame
titles are its free-text `title` fields. `sketch.mjs` warns, and lists each screen that appears
under more than one title. `handoff.mjs` needs `appScreens` and says so. To migrate:

1. `node scripts/migrate-flow.mjs` (or `--dry-run` to see the result first). It adds
   `appScreens`, naming each screen after its id ("create-habit" → "Create habit"), turns each
   frame's old title into its `stateName` (minus a leading screen name) and removes `title`. The
   old spec is kept as `flow.json.bak`.
2. Review what it lists: rename screens whose name reads badly; for each state name, keep it if
   it says what differs on the screen, move it to `entry` if it says how the user got there
   ("First launch"), or shorten it ("Progress saved" → "Saved"). Merge screen ids that are one
   screen (two "discard" dialogs are states of the screens they interrupt).
3. `node scripts/sketch.mjs --check`, then draw again. The frame titles change, so this is a
   change to show the user; the S-numbers don't change.
4. Older notes: `node scripts/scaffold.mjs --upgrade` adds the question-ID legend and sources to
   `notes/CLARIFICATIONS.md`, sources to `notes/DECISIONS.md` and *Opening the sketch* to
   `README.md`, without touching anything else. An older `HANDOFF.md` needs the `generated`
   marker lines from `assets/templates/HANDOFF.md` before `handoff.mjs` can fill it.

## What the script guarantees

- numbering in flow order: the number (S1, S2, …) above the top-left corner of every frame and
  map box, as plain text in the sketch font, and in every page tab. It sits outside the screen,
  and arrows and arrow labels keep clear of it;
- a clean drawing, or none. Each arrow goes straight to the next frame or straight up or down to
  a branch where it can; otherwise the script tries the routes it knows (around the side, along
  a lane between the rows, the long way round the page) and keeps one that lies on no other
  arrow, crosses none and runs over no screen. Each label is wrapped and moved along its arrow
  until it is clear of screens, arrows and other labels. If no such drawing exists for the
  layout you gave, `--check` fails, names the arrows or the label, and nothing is written;
- one name per screen: every frame is titled with its screen's `appScreens` name and its
  state, in the frame, its page name and the handoff;
- it never overwrites a diagram that was edited by hand without `--force` (and then keeps a
  `.bak`).

## When the check fails

The layout comes from the spec, so that is where to fix it. Try these in order and run `--check`
after each:

1. **Two arrows cross.** Look at which screens they join. Usually one screen is in the wrong
   place: move a branch under the screen it really interrupts (`below`), or change the order of
   the main path so that screens joined by an arrow sit next to each other.
2. **Many arrows return to one screen** (every branch ends with "back to the start"). Draw the
   return once: let the branches lead to one closing frame, and that frame back to the start.
3. **The journey does too much.** Split it into two journeys; each gets its own page. A screen
   that both need appears as a frame in each (a different `state`, for example `content` and
   `after-pairing`, with `"entry": "After pairing"`).
4. **No clear place for a label.** Shorten it to what the user does ("tap Save", not "the user
   taps the Save button at the bottom"). The script wraps labels by itself; `\n` isn't needed.

Don't work around a failure by removing a flow the decisions call for, and don't edit the diagram
by hand to hide it.

```
node scripts/sketch.mjs --check                       validate the spec and the routes
node scripts/sketch.mjs --style wireflow --open       write docs/prototypes/flow.drawio and open it
node scripts/sketch.mjs --style click-through --url   also write a browser-viewer link
node scripts/handoff.mjs --check                      the diagram and the handoff name every S-number alike
node scripts/migrate-flow.mjs                         give an older spec appScreens
```
