# iOS UX conventions

What an iOS app does, so the flow you sketch is one an iPhone app can have. These follow Apple's
Human Interface Guidelines. For Android see `../android/conventions.md`. When both platforms are
in scope the flow, screens and states are shared; note on a frame (`note`) where the iOS version
differs.

## Structure of a screen

- **Navigation bar** (`bar`): on top-level screens a large title; on pushed screens an inline
  title with the back button (`back: true`). Up to two trailing buttons; the primary one (+,
  Done, Save) is the rightmost.
- **No floating action button.** "Create" is a + in the navigation bar. A `fab` in the spec is
  drawn that way on iOS in the design phase; say so in the frame's `note` if it matters.
- **Tab bar** (`tabs` in the spec): top-level sections only, 2–5 tabs, never actions. It stays
  visible on pushed screens and is covered by modal tasks.
- **Modal tasks** (creating, editing) slide up, cover the tab bar and show **Cancel** on the
  leading side; the confirming action (Save, Add, Done) goes trailing in the navigation bar, or
  at the bottom of the form.
- **Content**: inset grouped lists for settings, forms and short collections; plain lists for
  feeds. One primary action per screen.
- iPhone in portrait is the design target. On iPad the tab bar can become a sidebar and
  list–detail screens sit side by side; sketch that only if iPad is in scope (A3).

## Back and navigation

- **There is no system back button.** Back is the navigation bar's back button and the swipe from
  the left edge; both pop one screen.
- **At the root of a tab, back does nothing.** An iOS app never "exits".
- Tapping the current tab again returns to its root (record it as a decision if it matters).
- Leaving a modal with unsaved input: Cancel asks first ("Discard Changes" / "Keep Editing") —
  a decision to record (N3). Swiping the modal down follows the same rule. Draw it: a flow from
  the form labelled "Cancel with changes" to a dialog frame hanging under it.

## Feedback and overlays

| Situation | Pattern | In the spec |
|---|---|---|
| Decision needed, or a destructive action to confirm | **alert**: short title, one-sentence message, 1–2 buttons (Cancel first, the action last; destructive in red) | `dialog`, its own frame |
| Choices tied to what the user just did (share, sort, "Remind me…") | **action sheet** with a separate Cancel | `sheet`, its own frame |
| Extra detail or a sub-task | **sheet** with a grabber, medium or large height | a frame of its own |
| Brief confirmation, optionally undo | iOS has **no snackbar**. Prefer showing the result in place (the row appears or disappears). A toast with Undo is a custom component: flag it in the handoff | `snackbar`, with a `note` |
| Ongoing status (offline, syncing) | inline notice under the navigation bar, or a footer in the list | `banner` |
| Waiting ≤ 300 ms | nothing | — |
| Waiting, unknown duration | activity indicator in place | a `loading` frame |
| Waiting with known steps or duration | progress view + what's happening in words + Cancel if possible | a frame with `text` and a `button` |
| Refreshing a list | pull to refresh (T4) | a `note` |

## Permissions

Draw the full flow; each step is a frame.

1. Ask in context, when the user starts the feature that needs it, not at launch.
2. **The system asks only once**, so show your own explanation first when the reason isn't obvious
   (a screen or alert: why + what happens). If the user declines that, the system alert is still
   unused and can be shown later.
3. System alert (`dialog` with `system: true`): the OS writes the title ("“App” Would Like to Use
   Bluetooth"); the message is the app's **purpose string** — required copy for every permission
   except notifications, and part of the handoff. Buttons: Don't Allow / Allow (location: Allow
   Once / Allow While Using App / Don't Allow).
4. **One denial is final.** The app can't ask again; explain what doesn't work and offer
   "Open Settings" (the app's page in Settings). This is the main difference from Android, where
   the app can ask a second time.
5. Notifications can also be requested "provisionally" (delivered quietly, no prompt) — a decision
   to record if it matters.

## Lists, forms and content

- Rows: the whole row is the touch target; a disclosure chevron only when the row navigates; a
  trailing value in the secondary label colour.
- Swipe actions (for example swipe to delete) are common but hidden; always offer a visible way to
  do the same thing (an Edit button, or Delete on the detail screen). Don't draw a flow that
  depends on a swipe alone.
- Forms: grouped fields with visible labels; errors next to the field, after the user leaves it
  or submits.
- Buttons: verb first. iOS apps often use title case ("Add Reading"); follow the product's copy
  guide and be consistent.
- Empty states: say what will appear here and give the action that makes it appear.
- Error states: say what happened in plain words, what the user can do, and offer retry.
- Numbers with units, dates and times formatted for the locale (C3).

## Touch and accessibility

These are checked in the design phase (`look/screens.html`); keep them in mind when choosing
what goes on a screen.

- Minimum touch target 44 × 44 pt, at least 8 pt between targets.
- No hover-only information, no right-click, no long-press-only paths (a context menu needs a
  visible alternative).
- Text contrast at least 4.5:1 (3:1 for large text and icons).
- Every control has a name (a VoiceOver label). Icon-only buttons need one.
- **Dynamic Type**: all content text scales. At the largest sizes content may scroll and rows
  stack, but nothing essential may be cut off.

## Things that belong to the handoff

- Icons: record the intended SF Symbol for each icon.
- The minimum iOS version (A5) decides the generation of the look: iOS 26 and later use Liquid
  Glass; earlier versions the classic materials.

The look itself — tint, materials, type, dark mode — is covered by `visual-language.md` in this
folder, in the design phase only.
