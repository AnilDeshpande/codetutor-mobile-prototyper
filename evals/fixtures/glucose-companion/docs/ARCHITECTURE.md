# Glucose Companion — Architecture

## Connectivity

- BLE via the Android Companion Device Manager.
- Only **one active BLE connection** at a time across the app.
- Readings are stored locally (Room) and uploaded to the backend when online. Upload is queued
  with WorkManager and retried with backoff.

## Sync

- Initial sync after pairing reads up to 500 records; typical duration 20–60 s.
- Incremental sync runs when the meter connects (the meter wakes after each measurement).

## Offline

- The readings list is served from the local database; it works fully offline.
- Manual entries are saved locally first and uploaded later.

## Backend

- Registration of a paired meter requires the backend (`POST /devices`). If the call fails, the
  pairing is kept locally and registration is retried.
