# Scenario: <journey name>

ID: `<kebab-case-id>` · Mock scenario: `?scenario=<id>` · Decisions: <IDs>

## Given
- <starting state the user sees, e.g. "No meter has been paired yet">
- Starts on screen `<screen-id>` in state `<state>`

## When / Then
| # | When the user… | Then they see… | Screen · state |
|---|---|---|---|
| 1 | taps **Add device** | the Bluetooth rationale sheet | `devices` · content |
| 2 | taps **Continue** | the system permission dialog | `devices` · content |
| 3 | | | |

## Back behaviour
| From | System back goes to |
|---|---|
| | |

## Unhappy paths covered elsewhere
- `<scenario-id>` — <what differs>
