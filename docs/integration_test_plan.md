# Integration and Edge Case Test Plan

This document outlines the systematic integration test plan used to validate the AI Supply Chain Disruption Alert Summarizer.

---

## 1. 8 End-to-End Integration Scenarios

| Test ID | Scenario Description | Tested Flow | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **INT-01** | First-Time User Setup | Launch Flask app $\rightarrow$ Open `127.0.0.1:5000` $\rightarrow$ Check default template presets load. | Presets are auto-inserted into the SQLite DB and visible as click-chips in the UI. |
| **INT-02** | Form Fields Client-Side Validation | Leave Admin Name blank $\rightarrow$ Click Submit. | Red warning appears: "Logger name is required". Submit button disabled. |
| **INT-03** | End-to-End Summary Generation (Mock) | Click Steel preset $\rightarrow$ Submit form $\rightarrow$ Verify output cards populate. | Form fields fill; loader plays; output renders correctly with 5-day Hyderbad steel delay summary. |
| **INT-04** | Latency Measurement Logging | Click Generate $\rightarrow$ Measure execution duration $\rightarrow$ Verify database value. | Response time displayed in UI (e.g. "Response: 0.15s") and logged under `response_time_ms` in SQLite. |
| **INT-05** | Rating & Feedback Persistency | Rate steel output 4 stars $\rightarrow$ Add comment $\rightarrow$ Click Save $\rightarrow$ Verify DB. | Row created in `feedback` table linked to generation ID. Toast shows: "Feedback submitted!". |
| **INT-06** | Deep Linking / Detail Retrieval | Copy share link (`/?id=1`) $\rightarrow$ Open in new tab $\rightarrow$ Check Dashboard state. | Dashboard automatically loads detail fields and displays the correct summary. |
| **INT-07** | Admin Analytics Aggregation | Access Admin Analytics $\rightarrow$ Check total counts and quality rating indicators. | Counters increase; Chart.js renders daily bars and rating trend lines reflecting the active logs. |
| **INT-08** | Client-Side PDF Generation | Click Download PDF $\rightarrow$ Verify file output in Downloads. | Beautiful portrait A4 layout with print headers generated. Text matches UI perfectly. |

---

## 2. 3 AI-Specific Edge Case Scenarios

### EDGE-01: Extremely Long Supplier Input
* **Input**: Ingesting a massive 950-character supplier logistics report containing multiple redundant paragraphs and transport codes.
* **Expected Result**: Frontend character counter flags warning (orange/red text). Backend parses the text successfully without truncation issues.

### EDGE-02: Non-English Supplier Input
* **Input**: A supplier notification written in Telugu or Hindi (common for Hyderabad local transportation unions).
* **Expected Result**: Gemini API successfully translates and processes the text, returning the disruption summary in English. Local Mock Fallback defaults to a generalized logistics disruption summary if the API is offline.

### EDGE-03: Vague or Intentionally Confusion-Prone Input
* **Input**: Inputting text unrelated to supply chain disruptions (e.g., "The weather in Hyderabad is pleasant today. I might go out for biryani.").
* **Expected Result**: Gemini AI or the Mock Fallback detects no valid delay/shortage information, summarizes it as a generalized logistics update, and alerts the operator to verify supplier credentials.
