# Flow — {{APP_NAME}}

Status: draft, for confirmation at gate C · Decisions: <IDs this flow rests on>

## Navigation map

Top-level destinations, the stack under each, and where back goes. Overlays (dialogs, sheets,
permission prompts) are marked as such — they are not screens.

```text
<screen-id> (top level)
  → <screen-id> (<how it opens: push / modal / sheet>)
    → <outcome> → <screen-id>
    → <unhappy path> → <screen-id · state>
```

## Screens

| Screen | Purpose | Reached from |
|---|---|---|
| `<screen-id>` | | |

## State inventory

States: loading · content · empty · error · offline · partial · success (only those that apply).

| Screen | State | Mock scenario that shows it |
|---|---|---|
| `<screen-id>` | | `<scenario-id>` |

## Back behaviour

| From | Android System back | iOS back / swipe |
|---|---|---|
| `<screen-id>` | | |

(Keep only the columns for the platforms in scope. Root: Android leaves the app; iOS does nothing.)

## Out of scope

What this flow deliberately leaves out, so the prototype doesn't imply it works.

-
