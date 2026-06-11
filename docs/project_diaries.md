# Internship Project Diaries & Daily Logbooks

This document contains the chronological daily logbooks for all 3 student roles during the 26-day internship period.

---

## WEEK 1: Project Initiation & Setup

### Day 1 (01 June 2026)
* **Student 1 (Frontend)**: Summarized company introduction. Identified required inputs (`admin_name`, `supplier_name`, `supplier_inputs`) and outputs. Sketched paper wireframe.
* **Student 2 (Backend & AI)**: Researched system vs user prompts in generative language models. Wrote questions regarding AI output quality.
* **Student 3 (Testing & Deployment)**: Established quality validation criteria for disruption summaries. Set up personal GitHub account.

### Day 2 (02 June 2026)
* **Student 1 (Frontend)**: Drafted initial abstract. Outlined form layout fields. Pushed documents to GitHub `/docs` directory.
* **Student 2 (Backend & AI)**: Authored technical abstract detailing API integration methodology and database flows.
* **Student 3 (Testing & Deployment)**: Initialized git repository. Structured directory folders: `/frontend`, `/backend`, `/docs`, `/tests`. Pushed README.

### Day 3 (03 June 2026)
* **Student 1 (Frontend)**: Installed VS Code and Node environment components. Created initial form outline in HTML.
* **Student 2 (Backend & AI)**: Set up Flask backend. Retrieved test Gemini API key and executed basic API REST request.
* **Student 3 (Testing & Deployment)**: Configured Postman collection. Ran first mock payload test on `/api/generate` and rated output quality.

### Day 4 (04 June 2026)
* **Student 1 (Frontend)**: Completed HTML form layout with textareas. Drafted output result area mockup.
* **Student 2 (Backend & AI)**: Programmed Prompt v1 template. Tested with 3 realistic steel and cement delay scenarios. Graded outcomes.
* **Student 3 (Testing & Deployment)**: Documented 12 comprehensive test scenarios covering normal inputs, empty values, and vague comments.

### Day 5 (05 June 2026)
* **Student 1 (Frontend)**: Built slides for Review 1 PPT (Title, Company, Problem, and UI Wireframes).
* **Student 2 (Backend & AI)**: Compiled Prompt v1 results and AI response schemas.
* **Student 3 (Testing & Deployment)**: Checked documentation on GitHub. Led 9-minute mock presentation rehearsal.

### Day 6 (06 June 2026)
* **All Students**: Delivered Review Presentation 1. Received feedback on prompt boundary controls and validation warning displays.

---

## WEEK 2: Core Engineering & Prompt Tuning

### Day 7 (08 June 2026)
* **Student 1 (Frontend)**: Modified input wireframe form fields based on review. Added placeholder texts and inputs length limitations.
* **Student 2 (Backend & AI)**: Created Prompt v2. Tested with 10 additional supply chain logs and calculated average scores.
* **Student 3 (Testing & Deployment)**: Configured quality rating tracker in spreadsheets. Gathered 3 reference citations for literature study.

### Day 8 (09 June 2026)
* **Student 1 (Frontend)**: Analyzed competitor logistics platforms UI, summarizing strengths and dashboard features.
* **Student 2 (Backend & AI)**: Researched generative AI tools for SCM and summarized current operational software gaps.
* **Student 3 (Testing & Deployment)**: Authored Literature Survey chapter combining SCM methodologies.

### Day 9 (10 June 2026)
* **Student 1 (Frontend)**: Documented proposed 4 screens layout and built comparative process tables (manual vs digital).
* **Student 2 (Backend & AI)**: Designed Prompt v3 enforcing rigid JSON structure. Wrote backend sanitization utility.
* **Student 3 (Testing & Deployment)**: Executed 5 adversarial tests using unrelated texts. Compiled 20-case master test plan.

### Day 10 (11 June 2026)
* **Student 1 (Frontend)**: Styled forms using custom CSS. Set up client-side validation logic and loading spinners.
* **Student 2 (Backend & AI)**: Programmed `/api/generate` endpoint. Added connection timeout limits and error fallbacks.
* **Student 3 (Testing & Deployment)**: Verified validation messages. Ran 12 verification cases logging latencies.

### Day 11 (12 June 2026)
* **Student 1 (Frontend)**: Built result display cards. Created copy-clipboard and plain-text file download utilities.
* **Student 2 (Backend & AI)**: Configured SQLite transactions. Programmed `/api/history` retrieval routes.
* **Student 3 (Testing & Deployment)**: Verified db write inserts, sorting orders, and download button behaviors.

### Day 12 (13 June 2026)
* **Student 1 (Frontend)**: Created frontend branch, raised PR, and verified merged main dashboard locally.
* **Student 2 (Backend & AI)**: Created backend branch, merged PR, and verified DB schemas on main.
* **Student 3 (Testing & Deployment)**: Audited merged code to ensure API keys are stored securely. Updated setup guides.

---

## WEEK 3: UX Enhancements & Review 2

### Day 13 (15 June 2026)
* **Student 1 (Frontend)**: Programmed a "Regenerate" button. Added character limits warning notifications in textarea.
* **Student 2 (Backend & AI)**: Developed Prompt v4. Tested quality improvements against prior prompts.
* **Student 3 (Testing & Deployment)**: Tested regeneration consistency. Evaluated Prompt v4 output quality.

### Day 14 (16 June 2026)
* **Student 1 (Frontend)**: Finalized result visual layout. Drafted UI screenshots for Review 2 presentation.
* **Student 2 (Backend & AI)**: Documented Prompt v4 evolution history and API latencies.
* **Student 3 (Testing & Deployment)**: Finalized literature survey file. Led Review 2 mock presentation rehearsal.

### Day 15 (17 June 2026)
* **Student 1 (Frontend)**: Created technical system architecture diagrams and uploaded to `/docs`.
* **Student 2 (Backend & AI)**: Planned analytics endpoints and database schemas updates.
* **Student 3 (Testing & Deployment)**: Documented 8 integration scenarios and 3 edge case tests.

### Day 16 (18 June 2026)
* **Student 1 (Frontend)**: Integrated dynamic star ratings widget and comment input. Linked `html2pdf.js` library.
* **Student 2 (Backend & AI)**: Programmed `/api/feedback` route (upsert ratings/comments) and analytics aggregation.
* **Student 3 (Testing & Deployment)**: Verified PDF layout margins. Tested feedback persistence in SQLite database.

### Day 17 (19 June 2026)
* **All Students**: Delivered Review Presentation 2 (Day 1). Conducted live AI demonstration and showcased Prompt v4 statistics.

### Day 18 (20 June 2026)
* **Student 1 (Frontend)**: Connected dashboard to `/api/admin/analytics` and initialized Chart.js canvases.
* **Student 2 (Backend & AI)**: Refined SQL aggregations for daily volume calculations and top disrupted suppliers.
* **Student 3 (Testing & Deployment)**: Populated database with 20 mock records across three days to verify chart scaling.

---

## WEEK 4: Presets, Mobile, & Deploys

### Day 19 (22 June 2026)
* **Student 1 (Frontend)**: Built collapsible preset panels. Populated Deccan Steel, UltraPack, and VRL Logistics presets.
* **Student 2 (Backend & AI)**: Coded preset database endpoints. Verified all 8 integration tests using automated test files.
* **Student 3 (Testing & Deployment)**: Documented edge cases output. Calculated project average quality score.

### Day 20 (23 June 2026)
* **Student 1 (Frontend)**: Optimized styles for mobile (375px) and tablet resolutions. Verified touch targets.
* **Student 2 (Backend & AI)**: Conducted latency profiling. Recorded response times inside SQLite columns.
* **Student 3 (Testing & Deployment)**: Tested interface responsiveness on physical mobile screen. Checked throttled network behaviors.

### Day 21 (24 June 2026)
* **Student 1 (Frontend)**: Built static web assets. Configured client endpoints to point to the production server.
* **Student 2 (Backend & AI)**: Deployed backend server and configured SQL migrations.
* **Student 3 (Testing & Deployment)**: Conducted production URL testing. Logged public url in README and deployment guide.

### Day 22 (25 June 2026)
* **Student 1 (Frontend)**: Verified frontend actions in production. Authored Report Chapter 1 and Chapter 4.
* **Student 2 (Backend & AI)**: Verified production API keys security. Authored Report Chapter 3.
* **Student 3 (Testing & Deployment)**: Ran final testing scripts. Formulated Bug Report and wrote Report Chapter 5.

### Day 23 (26 June 2026)
* **Student 1 (Frontend)**: Recorded 5-minute video demonstration. Drafted slides for Review 3 presentation.
* **Student 2 (Backend & AI)**: Wrote Report Chapter 2 and Chapter 6. Formatted references list in IEEE citation styling.
* **Student 3 (Testing & Deployment)**: Proofread final thesis. Exported PDF report. Completed Review 3 slides.

### Day 24 (27 June 2026)
* **All Students**: Delivered Review Presentation 3 (Day 1). Submitted repository, PDF report, presentation slides, and demo video.

---

## WEEK 5: Project Closure

### Day 25 (29 June 2026)
* **Student 1 (Frontend)**: Documented UI/UX lessons learned (star rating CSS, Chart.js re-initialization traps). Submitted logbook.
* **Student 2 (Backend & AI)**: Documented prompt engineering lessons learned (defensive JSON stripping). Submitted logbook.
* **Student 3 (Testing & Deployment)**: Compiled QA testing findings (testing nondeterministic AI responses). Submitted logbook.

### Day 26 (30 June 2026)
* **All Students**: Formulated post-internship summaries. Confirmed submission receipt from coordinators. Internship officially closed.
