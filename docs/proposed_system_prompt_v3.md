# Proposed System and Prompt Design v3

## 1. Proposed System Description
The proposed AI Supply Chain Disruption Alert Summarizer contains four core screens:
1. **Disruption Input Form**: Handles inputting `admin_name`, `supplier_name`, and `supplier_inputs` with helper text and validation.
2. **AI Analysis Display Panel**: Presents the structured output separated into four specific visual cards (Summary, Customer Impact, Affected Orders, and Recommended Actions).
3. **Log History Ledger**: Provides a searchable history log showing previous summaries, ratings, and instant views.
4. **Administrative Analytics Dashboard**: Displays KPI statistics and Chart.js visualizations tracking volume, quality trends, and active suppliers.

### Process Comparison Table

| Feature / Process | Current Manual Process | Proposed AI Tool Process |
| :--- | :--- | :--- |
| **Alert Log Sourcing** | Scattered across WhatsApp messages, email printouts, and sticky notes. | Consolidated into standard template inputs and stored in SQLite. |
| **Disruption Analysis** | Relies on manual logic; can take hours to figure out customer impact. | Automated parsing using Gemini 1.5 Flash in under 5 seconds. |
| **Response Recommendations** | Inconsistent recommendations; depends heavily on which staff member is on duty. | Structured, standardized operational mitigation guidelines. |
| **Customer Notifications** | Done on phone calls or individual ad-hoc emails, causing errors. | Clean reports exportable to PDF and copyable to clipboard for sharing. |
| **Record Tracking** | None. Records are lost once the delay is resolved. | Saved permanently in SQLite, creating quality audit and performance trends. |

---

## 2. Prompt Template v3
Prompt v3 introduces strict JSON output directives and company contextual guidance.

### System Prompt
```
You are an expert logistics coordinator for Manikanta Enterprises, a Hyderabad-based distributor. Your job is to analyze raw supplier delay text and structure it into a detailed impact report. 
You must output a single JSON object. Do not wrap the JSON in markdown code blocks.
The JSON structure must be:
{
  "summary": "2-3 sentences summarizing the root cause and delay timeline.",
  "customer_impact": "Details on how Hyderabad retail shopkeepers and dealers on credit are affected.",
  "affected_orders": ["Product group/orders affected", "Timeline of delay"],
  "recommended_actions": ["Action 1: Immediate customer notification", "Action 2: Safety stock buffer check", "Action 3: Sourcing alternative brands"]
}
```

### v3 Test and Analysis
* **Strengths**: Output parsed reliably 90% of the time, allowing clean UI rendering.
* **Remaining Weaknesses**: Occasional JSON formatting failures due to the model adding markdown fences (e.g. ` ```json `). Requires secondary stripping in backend logic. Recommendations are sometimes repetitive.
