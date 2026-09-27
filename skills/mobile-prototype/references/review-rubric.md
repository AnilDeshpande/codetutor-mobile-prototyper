# Review rubric

Use after each verification round (Phase 7). Look at the screenshots, not the code. Grade each
finding by severity; fix all blockers and majors before showing the user.

| Severity | Meaning |
|---|---|
| **Blocker** | a journey can't be completed, a decision isn't implemented, a required state is missing or unreachable |
| **Major** | the user could get lost, misread something important, or hit a dead end; a platform convention is broken |
| **Minor** | polish: alignment, spacing, wording, visual weight |

## Checklist

**1. Journey**
- Can each step be done from what is on screen, without knowing the scenario?
- Is the next action obvious — one primary action per screen?
- Does the user always know where they are (title, selected navigation item) and how to get back?
- Does finishing land somewhere sensible, with confirmation that it worked?

**2. Hierarchy**
- Is the most important information the most prominent? (Squint: what stands out first?)
- Are related things grouped and unrelated things separated?
- Are there no more than two or three levels of emphasis on a screen?

**3. States**
- Every state in the inventory exists and is reachable by URL.
- Loading: does something appear within 300 ms? Is long waiting explained, with cancel where possible?
- Empty: does it explain and offer the action?
- Error and offline: plain words, what to do, retry; the user's input is kept.
- Partial success (S7) is visible, not silently treated as success or failure.

**4. Platform conventions** (`platforms/<platform>/conventions.md`, per platform in scope)
- Back behaves as the navigation map says; dialogs and sheets close on back first.
- Android: bottom navigation only on top-level screens, rail on medium and expanded; back at the
  start destination leaves the app; snackbar vs dialog vs banner used for the right purpose.
- iOS: large title on top-level screens; back button shows where it goes; + in the navigation bar
  instead of a FAB; tab bar stays on pushed screens and is covered by modal tasks (with Cancel);
  alert vs action sheet vs sheet used for the right purpose; nothing happens on back at a tab's root.
- Permissions asked in context, with rationale, denial and blocked paths — on iOS one denial is
  final, and each prompt has a purpose string.
- A screen that looks like the *other* platform (a FAB on iOS, a centred alert on Android, an
  iOS-style back chevron with a label on Android) is a major finding.

**5. Accessibility** (audit results + screenshots)
- No small targets, no unnamed controls, no horizontal overflow, no overlapping text (audit empty).
- Text contrast looks sufficient in both themes; state isn't shown by colour alone.
- Works at `fontScale=2` (Android) and `fontScale=3` (iOS, largest Dynamic Type).

**6. Content**
- Copy comes from the documents or reads like a real product — no lorem ipsum, no "Item 1".
- Realistic data lengths: long names, large numbers, zero, one, many.
- Units and formats match C3; sensitive data handled per C4.

**7. Consistency**
- Same thing, same name, same look, same place, across screens.
- Only token roles used (neutral `--color-*` / `--text-*` in screen code, platform roles in the
  platform stylesheet); no one-off colours or font sizes.

**8. Layout across windows**
- Phones (compact, iphone, iphone-se): nothing clipped behind the system bars, the Dynamic Island,
  the Home indicator or the bottom navigation / tab bar.
- Tablets (medium, expanded, ipad): content width limited (≈ 600–840 px for reading), or split
  into panes; no stretched buttons.

**9. Visual direction** (Phase 9 only, after a direction is applied)
- The look matches the approved `DESIGN.md`: brand colour where the *Colour use* section puts it,
  and nowhere it rules out; type hierarchy as described.
- Still native: Android uses Material roles and tonal surfaces; iOS keeps system backgrounds and
  labels, the brand only as the tint. A branded navigation bar on iOS, or web-style shadows and
  hover effects on either, is a major finding.
- Nothing about behaviour changed: same screens, states, navigation and approved copy.
- `notes/THEME-REPORT.md` passes and the audit's `lowContrast` is empty in both themes.

## Exit criteria for Phase 7

- All scenarios pass in the required matrix (latest round).
- Zero blockers, zero majors; minors either fixed or listed for the user.
- Audit lists empty for every screen and state.
- No console errors.

If these aren't met after three rounds, stop iterating and bring the remaining issues to the user
with your recommendation for each.
