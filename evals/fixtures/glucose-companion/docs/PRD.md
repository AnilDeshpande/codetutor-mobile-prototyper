# Glucose Companion — Product Requirements

Version 0.3 · 2026-09-10

## Users

Adults with type 2 diabetes who measure blood glucose at home 1–4 times a day with a Bluetooth
meter. Many are over 60; some have reduced eyesight.

## Goal

Readings arrive in the app automatically after the meter is paired, so users never type them in.

## In scope for the first release

- Pair a Bluetooth glucose meter (onboarding and from Settings).
- See the list of readings, newest first, with before/after meal tags.
- Manual entry of a reading when the meter isn't available.

Out of scope: insulin logging, sharing with clinicians, trends and charts.

## Device management

- Users can register up to 3 meters.
- The user can leave pairing at any time.
- After pairing, the app syncs all readings stored on the meter.

## Readings

- Values shown in mmol/L.
- A reading above 13.9 mmol/L is shown as "High" with advice to follow the care plan.

## Acceptance criteria

1. A new user can pair a meter and see their readings in under 2 minutes.
2. If Bluetooth is off, the app explains how to turn it on.
