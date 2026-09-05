# Implementation Plan

## Phase 1 — Stabilization

### Task 1 — Fix RailRadar train search

Status: COMPLETE

Acceptance criteria:
- /search-trains returns HTTP 200
- valid trains are returned
- invalid requests produce useful errors

Verification:
- API request tested successfully

---

### Task 2 — Fix live train retrieval

Status: COMPLETE

Acceptance criteria:
- live train endpoint works
- current delay is displayed
- station information is displayed

Verification:
- API request tested successfully
- Backend test passed
- Manual verification complete

---

### Task 3 — Fix prediction pipeline

Status: COMPLETE

Acceptance criteria:
- model loads correctly
- feature construction matches training
- future station predictions are generated
- predictions don't diverge unrealistically
- prediction endpoint returns expected schema

Verification:
- Model loads correctly (best_model_v1.pkl)
- MAE: 1.36 min (baseline: 2.57 min)
- RMSE: 2.30 min
- R²: 0.66 (beats naive persistence baseline)
- Dynamic response verified: current delay 0→10→20 min → predicted delay -3.28→7.6→16.64 min
- Prediction endpoint tested with both real and future stations
- Confidence score generated
- Destination ETA computed

---

## Phase 2 — UI

### Task 4 — Improve delay visualization

Status: COMPLETE

Acceptance criteria:
- delay trend chart displays actual vs predicted
- station timeline shows scheduled/actual/predicted times
- ETA information is visible

Verification:
- LiveStationTimeline renders predictions correctly
- DelayTrendChart shows actual vs predicted delay
- Destination ETA displayed with current delay context