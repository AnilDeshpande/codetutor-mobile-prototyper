# Handoff package (`prototype/HANDOFF.md`)

The handoff is what a native implementation (by a person or another agent skill) starts from.
It must be complete enough that nobody needs to reverse-engineer the HTML. Use the template in
`assets/templates/HANDOFF.md` and fill every section; write "none" rather than leaving one out.

## Sections

1. **Summary**: the feature, the users, the platforms (Android, iOS or both) and minimum OS
   versions, the journeys covered, the approval date and who approved.
2. **Inputs**: documents used (with versions or dates), from `notes/INPUTS.md`.
3. **Screen inventory**: one row per screen: id, title, purpose, entry points, top-level
   destination it belongs to.
4. **Navigation graph**: text diagram of destinations and stacks, plus a table of where back goes
   from each screen and which transitions need confirmation. The flow is shared; note where the
   platforms differ (Android: system back, and back at the start destination leaves the app; iOS:
   back button and edge swipe, nothing at a tab's root, modal tasks with Cancel).
5. **State model per screen**: for each screen, the states (loading, content, empty, error,
   offline, partial…) with what triggers each and what the user sees. Name them so they map
   directly onto a UI-state type, for example:
   ```
   DeviceListUiState = Loading | Empty | Content(devices, lastSync) | Error(message, canRetry) | Offline(cached)
   ```
6. **Component mapping**, per platform in scope: each distinct UI element in the prototype → the
   component it stands for, noting variants.
   - **Android (Material 3 / Compose)**: TopAppBar, NavigationBar / NavigationRail, ListItem,
     FilledButton, OutlinedTextField, ModalBottomSheet, AlertDialog, Snackbar,
     LinearProgressIndicator…
   - **iOS (SwiftUI)**: NavigationStack + `.navigationTitle` (large / inline), TabView (sidebar
     adaptable on iPad) or NavigationSplitView, `.toolbar` items, List (`.insetGrouped`), Form,
     Button (`.borderedProminent` / `.bordered` / plain), TextField, Toggle, `.alert`,
     `.confirmationDialog`, `.sheet` with `.presentationDetents`, ProgressView, `.refreshable`,
     `.swipeActions`. Mark anything that has no native equivalent (for example the undo toast
     that stands in for a snackbar) as **custom**, and give the intended SF Symbol for each icon.
7. **Theme**, per platform: which look was approved (the platform baseline, a visual direction,
   or a design system — link `design-system/<app>/`), then the values from
   `notes/THEME-REPORT.md`: the full Material 3 colour scheme in light and dark with its seed and
   variant, and whether dynamic colour is on; the iOS AccentColor in light and dark, any custom
   colours, and the materials generation (classic or Liquid Glass); the type styles, fonts (with
   licences), shape and spacing actually used. Enough to define the theme natively without
   opening the prototype. At the design-system level, point to `material-theme.json` and
   `ios-theme.json`.
8. **Copy**: every user-facing string, grouped by screen, marked `approved` or `draft`, with
   platform variants side by side where they differ (button case, "Settings" wording). On iOS
   include each permission's purpose string.
9. **Decisions**: everything in `DECISIONS.md`, each with its source (document, user, assumption).
   List assumptions separately at the top of this section: they need confirming before build.
10. **Open questions**: anything still open, with owner if known.
11. **Verification**: the final round's matrix from `VERIFICATION.md` per platform, and what was
    not verified (for example, tablets out of scope).
12. **Visual references**: links to `storyboard.html` and the screenshots per screen and state.
    These are the approved look; they can serve as reference images for screenshot tests.
13. **Out of scope for the prototype**: what the prototype deliberately fakes (real Bluetooth,
    real auth, persistence, analytics) so nobody mistakes a mock for a design decision.

## What not to include

- Implementation advice for the native code (architecture, libraries, module structure), and no
  Compose, SwiftUI, Kotlin or Swift code. That belongs to the implementation step.
- The prototype's own HTML/JS structure. It's disposable.
