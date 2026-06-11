# Project Objectives

This document outlines the core objectives of the AI Supply Chain Disruption Alert Summarizer prototype from three key perspectives.

---

## 1. User Experience (UX) Objectives
* **Instant Presets Loading**: Allow administrative users to load common disruption scenarios (steel delays, strike logistics, packaging shortage) with a single click, autofilling inputs to reduce administrative entry time.
* **Structured Analysis Cards**: Present the AI output in clean, readable sections (Summary, Customer Impact, Affected Orders, Recommended Actions) instead of a single raw text dump, enabling immediate scannability.
* **One-Click Export & Sharing**: Provide immediate Copy to Clipboard, Download as TXT, and Download as PDF options for rapid distribution to logistics teams.
* **Mobile-Responsive Accessibility**: Ensure the entire application is fully functional and readable on mobile layouts (down to 375px) so warehouse managers can log alerts on the go.
* **Interactive Data Visualization**: Integrate a visual analytics dashboard displaying total alerts, supplier risk distribution, and rating trends over time to give immediate administrative insights.

---

## 2. Backend & AI Objectives
* **Secure API Integration**: Establish a secure connection to the Google Gemini API using environment variables (`.env`) to prevent exposing API keys in public repositories.
* **High-Fidelity Offline Fallback**: Build a rule-based mock engine that intercepts requests when the Gemini API is offline or unconfigured, returning realistic, context-specific responses.
* **Structured JSON Extraction**: Enforce strict JSON output formatting from the Gemini model to enable clean backend parsing and prevent UI breakage from raw markdown.
* **Efficient Database Storage**: Utilize SQLite database tables to catalog generations, timestamp entries, compile feedback ratings, and manage presets.
* **Fast Response Speeds**: Maintain average alert processing and generation times under 5 seconds (target < 3 seconds for local mock operations).

---

## 3. Testing & Quality Objectives
* **Functional Integration Coverage**: Develop automated Python unit tests (`unittest`) covering every backend API route, validation check, database insert, and analytics calculation.
* **Quality Score Threshold**: Achieve an average user quality score of $\ge 4.0 / 5.0$ stars across testing scenarios by refining the system prompt templates.
* **Adversarial Input Handling**: Test the summarization engine with edge cases (very long inputs, short sentences, and vague or unrelated text) to ensure the system handles errors gracefully.
* **Cross-Device Layout Validation**: Audit touch-target sizing (minimum 44px) and element margins on multiple simulated screen sizes (mobile, tablet, desktop).
* **Feedback Verification**: Validate that ratings and comments submitted by users are correctly compiled and reflected in the quality trend charts.
