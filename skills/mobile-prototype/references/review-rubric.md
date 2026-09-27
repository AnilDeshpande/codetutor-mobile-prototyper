# Review rubric

Use after each verification round (Phase 7). Look at the screenshots, not the code. Grade each
finding by severity; fix all blockers and majors before showing the user.

| Severity | Meaning |
|---|---|
| **Blocker** | a journey can't be completed, a decision isn't implemented, a required state is missing or unreachable |
| **Major** | the user could get lost, misread something important, or hit a dead end; an Android convention is broken |
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

**4. Platform conventions** (`platforms/android/conventions.md`)
- Back and up behave as the navigation map says; dialogs and sheets close on back first.
- Bottom navigation only on top-level screens; rail on medium and expanded.
- Snackbar vs dialog vs banner used for the right purpose.
- Permissions asked in context, with rationale, denial and blocked paths.

**5. Accessibility** (audit results + screenshots)
- No small targets, no unnamed controls, no horizontal overflow (audit empty).
- Text contrast looks sufficient in both themes; state isn't shown by colour alone.
- Works at `fontScale=2`.

**6. Content**
- Copy comes from the documents or reads like a real product — no lorem ipsum, no "Item 1".
- Realistic data lengths: long names, large numbers, zero, one, many.
- Units and formats match C3; sensitive data handled per C4.

**7. Consistency**
- Same thing, same name, same look, same place, across screens.
- Only token roles used (neutral `--color-*` / `--text-*` in screen code, platform roles in the
  platform stylesheet); no one-off colours or font sizes.

**8. Layout across window classes**
- Compact: nothing clipped behind system bars or bottom navigation.
- Medium/expanded: content width limited (≈ 600–840 px for reading), or split into panes; no
  stretched buttons.

## Exit criteria for Phase 7

- All scenarios pass in the required matrix (latest round).
- Zero blockers, zero majors; minors either fixed or listed for the user.
- Audit lists empty for every screen and state.
- No console errors.

If these aren't met after three rounds, stop iterating and bring the remaining issues to the user
with your recommendation for each.
