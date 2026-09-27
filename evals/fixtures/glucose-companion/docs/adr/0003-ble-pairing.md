# ADR 0003: BLE pairing handshake

Status: accepted · 2026-08-02

## Decision

Use bonded pairing with the meter's 6-digit PIN printed on the back of the device.

## Consequences

- The handshake takes 5–15 s.
- Cancelling mid-handshake leaves the meter locked for 60 s; it refuses new pairing attempts
  during that time.
- Android 12+ requires the BLUETOOTH_CONNECT and BLUETOOTH_SCAN runtime permissions.
