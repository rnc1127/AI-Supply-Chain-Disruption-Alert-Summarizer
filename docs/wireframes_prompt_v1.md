# Wireframes and Prompt Design v1

## 1. UI Wireframes Description
The application features a single-page design split into three primary tabs, navigable via a sticky left-hand sidebar.

### Tab 1: Dashboard View
```
+-------------------------------------------------------------------------+
| [Logo] MANIKANTA     |  Supply Chain Disruption Dashboard  [Theme Btn]  |
| Alert Summarizer     |                                                 |
| -------------------- | ------------------------------------------------|
| (•) Dashboard        | LOG DISRUPTION ALERT    | AI GENERATED ANALYSIS |
| ( ) History          |                         | [Status]  [Latency]   |
| ( ) Admin Analytics  | Load Preset Template:   | --------------------- |
|                      | [Preset 1] [Preset 2]   | [Meta-Data Grid]      |
|                      |                         |                       |
| [Status Badge]       | Logger: [Input Field]   | 1. Summary            |
| [User Profile]       | Supplier: [Input Field] | [Summary Text]        |
|                      | Details:                |                       |
|                      | +---------------------+ | 2. Customer Impact    |
|                      | |                     | | [Impact Details]    |
|                      | |   [Text Area]       | |                     |
|                      | |                     | | 3. Affected Orders  |
|                      | +---------------------+ | - [Bullet 1]          |
|                      |                         |                       |
|                      |    [Generate Button]    | 4. Recommendations    |
|                      |                         | - [Bullet 1]          |
|                      |                         |                       |
|                      |                         | [Copy] [PDF] [Rate ★] |
+-------------------------------------------------------------------------+
```

### Tab 2: History View
* A tabular ledger showing: `Date | Supplier | Logger | Summary Preview | Quality Rating | Actions (View/PDF)`.

### Tab 3: Admin Analytics View
* Top row contains four KPI cards: Total Summaries, Avg Rating, Avg Response Time, Active Suppliers.
* Bottom grid contains three charts: Daily Volume (bar), Quality Trend (line), Top Suppliers (doughnut).

---

## 2. Prompt Template v1
Below is the initial system prompt structure drafted on Day 4.

### System Prompt
```
You are an AI assistant. Summarize the following supplier delay notification and write down the customer impact, the affected orders, and recommended actions.
```

### User Prompt Template
```
Supplier: {supplier_name}
Logger: {admin_name}
Notification Details: {supplier_inputs}
```

### Prompt v1 Critique & Failures
* **Lack of Context**: The system prompt did not know about Manikanta Enterprises' business model (goods distribution in Hyderabad, retail shopkeepers, credit-based repeat orders).
* **Formatting Issues**: The output was unstructured, returning free-form markdown paragraphs that were difficult to parse or render separately in the UI.
* **Vague Recommendations**: Recommending generic advice (e.g. "email your supplier") rather than local operational logistics steps (e.g. "audit warehouse buffer stocks, extend credit limits").
* **No JSON Enforcement**: The backend was unable to parse the response programmatically, causing UI rendering crashes.
