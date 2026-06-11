# Problem Statement and Abstract

## Manikanta Enterprises Background
Manikanta Enterprises is a major goods distribution and supply company in Hyderabad. The company manages procurement, warehousing, and distribution to retail dealers, shopkeepers, and institutional buyers. A large portion of their business is conducted on credit terms and repeat-order basis, which relies heavily on high-trust relationships and timely delivery.

## Problem Statement
Currently, Manikanta Enterprises handles supply chain disruptions (such as supplier delays, logistics bottlenecks, border strikes, or manufacturing shortages) without a centralized digital system. Supplier communications are received in various raw formats (long emails, WhatsApp texts, PDF notifications) and must be manually analyzed. 

This manual process leads to:
1. **Inefficient Analysis**: Delays in understanding which products are affected, the duration of the disruption, and the root causes.
2. **Customer Impact Blindness**: Inability to quickly map the delayed items to the specific Hyderabad retail dealers and shopkeepers awaiting those repeat orders.
3. **Reactive Customer Communication**: Communication with affected customers is slow and disorganized, resulting in complaints and potential revenue loss.
4. **No Historical Record**: Lack of centralized records makes it impossible to analyze supplier reliability trends, average resolution times, or historical impact metrics.

## Abstract
The **AI Supply Chain Disruption Alert Summarizer** is a web-based prototype designed to digitize and automate this workflow. 

The tool enables administrative users to:
1. Input raw supplier communication.
2. Automatically parse and generate structured risk analysis using Gemini AI.
3. Quantify customer impact and identify affected order groups.
4. Draft actionable mitigation and response recommendations.

The backend leverages a Python Flask server integrated with SQLite for data persistence (history and ratings) and utilizes Gemini 1.5 Flash for the AI summarization engine. The frontend is a modern, single-page dashboard designed with premium glassmorphism styling, interactive analytics charting, and quick-load presets for rapid deployment in daily logistics operations.
