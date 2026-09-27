# iOS UX conventions for HTML prototypes

The prototype runs in a browser but must behave like an iOS app. These conventions follow Apple's
Human Interface Guidelines. CSS pixels are used as a proxy for points (pt).

## Devices and width classes

| Device | Width class | Test viewport | Navigation | Layout |
|---|---|---|---|---|
| iPhone (6.1″) | compact | 393 × 852 | tab bar (2–5 tabs) | one column, navigation stack |
| Small iPhone (SE) | compact | 375 × 667 | tab bar | same; catches crowding and short screens |
| iPad (portrait) | regular | 820 × 1180 | sidebar (or tab bar) | sidebar + content; list–detail where natural |

iPhone is the primary design target. The small iPhone and iPad must not break even when they are
out of scope. The template's `platform/ios.css` switches the tab bar to a sidebar at 700 px, and
drops the Dynamic Island on iPad.

## Structure of a screen

- **Navigation bar**: on top-level screens a **large title** that collapses into the bar when the
  content scrolls; on pushed screens an inline title. Leading: the back button (‹ + the previous
  screen's title, or "Back" when that title is long). Trailing: up to two buttons (text or
  symbol); the primary one (+, Done, Save) is the rightmost.
- **No floating action button.** "Create" is a + in the navigation bar (or a toolbar button). The
  template turns a screen's `fab` into that button, keeping its `data-testid`.
- **Tab bar**: top-level sections only, never actions. It stays visible on pushed screens (iOS
  keeps it) and is covered by modal tasks.
- **Modal tasks** (the template's `focused` screens) slide up from the bottom, cover the tab bar and
  show **Cancel** on the leading side; the confirming action (Save, Add, Done) goes trailing in the
  navigation bar, or at the bottom of the form.
- **Content**: inset grouped lists for settings, forms and short collections; plain lists for
  feeds. One primary action per screen.

## Back and navigation

- **There is no system back button.** Back is the navigation bar's back button and the swipe from
  the left edge; both pop one screen. In the prototype, browser back and Esc do the same.
- **At the root of a tab, back does nothing.** An iOS app never "exits"; the Home indicator sends
  it to the background (the prototype shows a home screen with the app icon to reopen it).
- Tapping the current tab again returns to its root (record it as a decision if it matters).
- Leaving a modal with unsaved input: Cancel asks first ("Discard Changes" / "Keep Editing") —
  a decision to record (N3). Swiping the modal down follows the same rule.
- Never rely on the browser's own UI; the prototype must be usable through the app shell alone.

## Feedback and overlays

| Situation | Pattern |
|---|---|
| Decision needed, or a destructive action to confirm | **alert**: short title, one-sentence message, 1–2 buttons (Cancel on the left, the action on the right; destructive in red). Three or more choices, or long labels, stack. |
| Choices tied to what the user just did (share, sort, "Remind me…") | **action sheet** (confirmation dialog) with a separate Cancel. A template `sheet` with only options is drawn this way. |
| Extra detail or a sub-task | **sheet** with a grabber, medium or large height; iPad shows it centred. |
| Brief confirmation, optionally undo | iOS has **no snackbar**. Prefer showing the result in place (the row appears or disappears). A toast with Undo is a custom component: the template draws `ctx.snackbar` that way; flag it in the handoff. |
| Ongoing status (offline, syncing) | inline notice under the navigation bar, or a footer in the list |
| Waiting ≤ 300 ms | nothing |
| Waiting, unknown duration | activity indicator (spinner) in place |
| Waiting with known steps or duration | progress view + what's happening in words + Cancel if possible |
| Content loading on a screen with known layout | placeholders in the shape of the content |
| Refreshing a list | pull to refresh (T4) |

## Permissions

Simulate the full flow. iOS draws system alerts like any other alert, so the template labels them
"System alert (simulated)" for reviewers.

1. Ask in context, when the user starts the feature that needs it, not at launch.
2. **The system asks only once**, so show your own explanation first when the reason isn't obvious
   (a screen or alert: why + what happens). If the user declines that, the system alert is still
   unused and can be shown later.
3. System alert: the OS writes the title ("“App” Would Like to Use Bluetooth"); the message is the
   app's **purpose string** — required copy for every permission except notifications. Buttons:
   Don't Allow / Allow (location: Allow Once / Allow While Using App / Don't Allow).
4. **One denial is final.** The app can't ask again; explain what doesn't work and offer
   "Open Settings" (the app's page in Settings).
5. Notifications can also be requested "provisionally" (delivered quietly, no prompt) — a decision
   to record if it matters.

In the template: `requestPermission(name, { rationale, usage, prompt })`. `usage` is the purpose
string; `prompt: { ios }` overrides the title. After one denial the result is `blocked`, so
scenario `permission-denied` behaves like `permission-blocked` on iOS — verify the Settings path.

## Lists, forms and content

- Rows at least 44 pt tall; the whole row is the touch target; a disclosure chevron only when the
  row navigates; a trailing value in the secondary label colour.
- Swipe actions (for example swipe to delete) are common but hidden; always offer a visible way to
  do the same thing (an Edit button, or Delete on the detail screen). The prototype must not rely
  on a swipe.
- Forms: grouped fields with visible labels; errors next to the field, after the user leaves it
  or submits; the keyboard type fits the data (numbers, email).
- Buttons: verb first. iOS apps often use title case ("Add Reading"); follow the product's copy
  guide and be consistent.
- Empty states: say what will appear here and give the action that makes it appear.
- Error states: say what happened in plain words, what the user can do, and offer retry.
- Numbers with units, dates and times formatted for the locale (C3).

## Touch, motion and accessibility

- Minimum touch target 44 × 44 pt, even when the visible element is smaller. At least 8 pt between
  targets.
- No hover-only information, no right-click, no long-press-only paths (a context menu needs a
  visible alternative).
- Text contrast at least 4.5:1 (3:1 for large text and icons). `tokens/ios.css` uses Apple's
  accessible variants where the standard system colour falls short (red, green, secondary label);
  screen code uses the neutral `--color-*` tokens.
- Every control has an accessible name (VoiceOver label). Icon-only buttons need one.
- **Dynamic Type**: all content text scales. Test at the largest accessibility size
  (`?fontScale=3`, about AX5 for body text): content may scroll and rows stack vertically, but
  nothing essential may be cut off or overlap. Bar titles, back buttons and tab labels stay at
  their normal size (iOS shows them enlarged on long-press instead); large titles grow a little.
- Motion: spring-like, about 250–400 ms; with Reduce Motion, cross-fade instead of sliding.

## Safe areas and system UI

The template draws the status bar with the Dynamic Island (54 pt) and the Home indicator area
(34 pt); on iPad a 24 pt status bar and a 20 pt Home indicator area. Content scrolls under the
translucent bars, but nothing tappable sits under the Dynamic Island or the Home indicator.
Landscape (A4) and iPad multitasking (Split View, Slide Over) change the width class: check them
when in scope.

## Visual language

- Backgrounds, labels and separators use the **system semantic colours**, which adapt to dark mode
  automatically. The brand colour is the **tint** (accent) for interactive elements, not a large
  surface colour.
- The minimum iOS version (A5) decides the look: iOS 26 and later use **Liquid Glass**
  (translucent, floating bars and controls); earlier versions use the classic materials. The
  template's baseline (translucent bars, inset grouped lists, capsule buttons) reads correctly on
  both; the design phase can go further.
- Icons: SF Symbols can't be embedded in a web prototype (licence). The template uses simple open
  glyphs; record the intended SF Symbol for each icon in the handoff.
- Font: the system font (SF Pro on Apple devices). It isn't bundled; other systems show their own
  system font.

## Dark mode

Dark mode swaps the semantic colours, not inverted colours; grouped backgrounds become black with
dark grey cells. Check both appearances when V3 is in scope (default: yes). Images and
illustrations need to work on dark backgrounds.
