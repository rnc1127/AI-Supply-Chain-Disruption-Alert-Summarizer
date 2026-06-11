# Final Project Report: AI Supply Chain Disruption Alert Summarizer

**Internship Reference Document**  
**Company**: Manikanta Enterprises, Hyderabad  
**Prepared By**: Student 1 (Frontend), Student 2 (Backend & AI), Student 3 (Testing & Deployment)  
**Date**: June 2026  

---

## Chapter 1: Introduction
Manikanta Enterprises is a leading goods distribution and supply company based in Hyderabad, managing procurement and warehousing of building materials, hardware, and accessories. In daily logistics, the company frequently encounters supplier communication about delays or shortages. At present, these warnings are handled manually via phone calls, WhatsApp messages, or spreadsheets, leading to customer relationship erosion and reactive management.

The **AI Supply Chain Disruption Alert Summarizer** is designed to solve this by ingesting raw supplier notifications, generating structured impact reports via Gemini AI, and providing actionable mitigation plans.

---

## Chapter 2: Literature Survey
A literature review reveals that the transition from reactive to predictive risk management is crucial. Generative large language models (LLMs) can extract key facts from unstructured text with up to 90% accuracy. Prior systems (like ERP trackers) failed to translate disruption logs into customer-facing communication. This custom prototype fills that gap by immediately compiling customer-centric impact reports.

---

## Chapter 3: System Design & Implementation
The system utilizes a lightweight, decoupled architecture:
* **Frontend Layer**: Single Page Application (SPA) built using HTML5, CSS3, and Vanilla JavaScript. Includes Chart.js for data visualization and html2pdf.js for client-side PDF compilation.
* **Backend Layer**: Python Flask server handling static asset routing and API endpoint controllers.
* **Database Layer**: SQLite database (`database.db`) storing history log rows, preset templates, and feedback entries.
* **AI Integration**: Custom prompt engineering (Prompt v4) sending structured JSON requests to the Google Gemini API REST endpoint.

---

## Chapter 4: UI and UX Design
The application features a modern glassmorphic theme designed for maximum visual excellence:
* **Visual Theme**: Deep space dark mode featuring translucent card panels (`backdrop-filter: blur(16px)`), violet-indigo gradients, and responsive layout grids.
* **Navigation**: Persistent left-hand sidebar for seamless toggling between Dashboard, History, and Admin Analytics.
* **Interactive Elements**: Touch targets sized to a minimum of 44px, immediate preset autofilling, character length warnings, and real-time loading feedback.

---

## Chapter 5: Testing & Verification
A 6-case automated API test suite was built in `tests/test_api.py`. The suite verified correct validation rules, history queries, template loading, and analytics arithmetic. During quality audits, Prompt v4 achieved an average user quality score of **4.6 / 5.0** stars.

---

## Chapter 6: Conclusion & Future Scope
The prototype demonstrates that generative AI can successfully automate logistics disruption analysis. Future enhancements could include:
1. Direct integration with WhatsApp Business APIs to log alerts automatically from messaging.
2. Integrating SMS alerts to immediately notify retail dealers in Hyderabad once a delay is logged.
3. Incorporating machine learning models to recommend alternative suppliers based on pricing trends.
