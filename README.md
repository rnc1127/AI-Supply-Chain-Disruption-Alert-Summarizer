# AI Supply Chain Disruption Alert Summarizer

**Internship Reference Project**  
**Client Company**: Manikanta Enterprises, Hyderabad  
**Developers**: Student 1 (Frontend), Student 2 (Backend & AI), Student 3 (Testing & Deployment)  
**Project Duration**: 01 June 2026 - 30 June 2026 (26 Working Days)

---

## Project Overview
This tool allows administrative users at Manikanta Enterprises to log raw supplier communications (about delays, shortages, or transport strikes) and automatically generates structured assessments mapping the downstream customer impact, pending orders affected, and recommended logistics response actions.

---

## Technology Stack
* **Frontend**: HTML5, CSS3 (Glassmorphic Theme), Vanilla JavaScript (SPA), Chart.js (Analytics), html2pdf.js (PDF exports)
* **Backend**: Python 3.12, Flask 3.1.3
* **Database**: SQLite3 (Local file-based database)
* **AI Engine**: Google Gemini 1.5 Flash API (with built-in offline mock fallback)

---

## File Directory Structure
```
├── backend/
│   ├── app.py                 # Flask server & REST API
│   ├── database.db            # SQLite database file
│   └── db_helper.py           # Database schemas and presets helper
├── frontend/
│   ├── index.html             # Glassmorphic dashboard UI shell
│   ├── styles.css             # CSS variables, animations, styles
│   └── app.js                 # API connections, charts, export controllers
├── docs/
│   ├── problem_statement_abstract.md
│   ├── objectives.md
│   ├── wireframes_prompt_v1.md
│   ├── literature_survey_existing_tools.md
│   ├── proposed_system_prompt_v3.md
│   ├── prompt_v4_refinement.md
│   ├── architecture_diagram.md
│   ├── integration_test_plan.md
│   ├── final_report.md
│   ├── final_ppt.md
│   └── project_diaries.md     # Daily logbooks (Days 1 to 26)
├── tests/
│   └── test_api.py            # Automated API integration tests
├── .env                       # Environment variables (API Key)
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

---

## Setup & Running Guide

### 1. Install Dependencies
Ensure you have Python 3 installed. Run the following command from the project root:
```bash
pip install -r requirements.txt
```

### 2. Configure API Key
Open the `.env` file in the root directory and enter your Google Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*Note: If no API key is specified, the application automatically runs using its context-aware local mock engine for testing.*

### 3. Run the Server
Launch the Flask development server:
```bash
python backend/app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

### 4. Running Automated Tests
To execute the API test suite, run:
```bash
python -m unittest tests/test_api.py
```

---

## Deployed Links & Deliverables
* **Live Application URL**: [https://ai-supply-chain-alert-summarizer.vercel.app](https://ai-supply-chain-alert-summarizer.vercel.app)
* **GitHub Repository**: [https://github.com/rnc1127/AI-Supply-Chain-Disruption-Alert-Summarizer](https://github.com/rnc1127/AI-Supply-Chain-Disruption-Alert-Summarizer)
* **Demo Video Link**: [https://youtu.be/dQw4w9WgXcQ](https://youtu.be/dQw4w9WgXcQ) *(simulated)*
* **Report PDF**: Located at `/docs/final_report.md`
* **PPT File**: Located at `/docs/final_ppt.md`
* **Student Logbooks**: Located at `/docs/project_diaries.md`
