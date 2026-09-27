# Handoff package (`prototype/HANDOFF.md`)

The handoff is what a native implementation (by a person or another agent skill) starts from.
It must be complete enough that nobody needs to reverse-engineer the HTML. Use the template in
`assets/templates/HANDOFF.md` and fill every section; write "none" rather than leaving one out.

## Sections

1. **Summary**: the feature, the users, the journeys covered, the approval date and who approved.
2. **Inputs**: documents used (with versions or dates), from `notes/INPUTS.md`.
3. **Screen inventory**: one row per screen: id, title, purpose, entry points, top-level
   destination it belongs to.
4. **Navigation graph**: text diagram of destinations and stacks, plus a table of where system
   back and up go from each screen, and which transitions need confirmation.
5. **State model per screen**: for each screen, the states (loading, content, empty, error,
   offline, partial…) with what triggers each and what the user sees. Name them so they map
   directly onto a UI-state type, for example:
   ```
   DeviceListUiState = Loading | Empty | Content(devices, lastSync) | Error(message, canRetry) | Offline(cached)
   ```
6. **Component mapping**: each distinct UI element in the prototype → the Material 3 component it
   stands for (TopAppBar, NavigationBar / NavigationRail, ListItem, FilledButton, OutlinedTextField,
   ModalBottomSheet, AlertDialog, Snackbar, LinearProgressIndicator…), noting variants.
7. **Tokens**: the colour roles, type scale and shape values actually used from `tokens.css`, and any
   brand overrides — enough to define a theme.
8. **Copy**: every user-facing string, grouped by screen, marked `approved` or `draft`.
9. **Decisions**: everything in `DECISIONS.md`, each with its source (document, user, assumption).
   List assumptions separately at the top of this section: they need confirming before build.
10. **Open questions**: anything still open, with owner if known.
11. **Verification**: the final round's matrix from `VERIFICATION.md`, and what was not verified
    (for example, tablets out of scope).
12. **Visual references**: links to `storyboard.html` and the screenshots per screen and state.
    These are the approved look; they can serve as reference images for screenshot tests.
13. **Out of scope for the prototype**: what the prototype deliberately fakes (real Bluetooth,
    real auth, persistence, analytics) so nobody mistakes a mock for a design decision.

## What not to include

- Implementation advice for the native code (architecture, libraries, module structure). That
  belongs to the implementation step.
- The prototype's own HTML/JS structure. It's disposable.
