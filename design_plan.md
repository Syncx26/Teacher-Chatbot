# Design & Implementation Plan: Synapse War Room AI

## 1. Visual Architecture
*   **The Homepage (Focus Portal):** A minimalist gateway focused 100% on starting a learning session. A single input: "What AI should we build today?"
*   **The Tutor Page (Workspace):** A clean, focused hybrid of a chatbot and an IDE.
    *   **Left:** 12-Week Curriculum & Progress (Clear, vertical progression).
    *   **Center:** High-fidelity Chat & Integrated Python Executor (The main tool).
    *   **Right:** Resource & Tool Library (Documentation, API links, and Snippets).
### R6: The Research Hub (AI Systems Engineering Mastery)
*   **Chronological Feed:** A dedicated "Research" tab shall display a real-time, chronological list of new AI papers (scraped every 24 hours).
*   **Manual Sync:** A "Sync Now" button shall allow the User to manually trigger an update of the research database.
*   **Summarization Engine:** Selecting a paper generates an "Easy-to-Read" executive summary covering Abstract, Methodology, and Key Innovations.
*   **Contextual Handoff:** A "Chat About This Paper" button shall transition the User back to the Chat tab, automatically injecting the paper's full text into the chatbot's context window.

### R7: Required Research APIs
1.  **arXiv API:** For official pre-prints and high-veracity AI research (CS.AI, CS.LG categories).
2.  **Semantic Scholar API:** For citation counts, influence metrics, and discoverability of non-arXiv papers.
3.  **Hugging Face Hub API:** To track new models, datasets, and technical blogs associated with trending research.
4.  **Tavily/SerpAPI:** For searching "Recent AI News" and blog posts (e.g., OpenAI/Anthropic official updates) that aren't formal papers.

### PAGE 1: The Gateway
*   **Hero Section:** A focused search/prompt bar.
*   **Dynamic Visuals:** Subtle blueprint or code-based background animations.
*   **Roadmap View:** A click-through visualization of the 12-week AI Architect journey.

### PAGE 2: The Tutor Dashboard
*   **Learning Engine:** Structured multi-model chat (Claude/Gemini/GPT).
*   **Pomodoro & XP:** Fixed timers and dopamine counters to manage ADHD focus.
*   **Code Sandbox:** A place to immediately run and test the Python scripts we build together.
*   **Tooling:** Integrated access to LLM APIs, Vector DBs, and local file storage.

---

## 3. Technical Implementation Strategy

### Frontend: Next.js + Tailwind + Framer Motion
*   **Animations:** Use Framer Motion for smooth glassmorphism transitions and "tactical" UI reveals.
*   **Dashboard State:** React Context or Zustand to manage the shared state of all dashboard panels.

### Backend: LangGraph + MCP + SQLite
*   **Persistence:** Use the SQLite State Bus (from the requirements doc) to synchronize chat history across all agents.
*   **Orchestration:** LangGraph to manage the logic between the Journalist fetching news and the Analyst reasoning.
*   **Connectivity:** MCP (Model Context Protocol) to pull in live news and financial data.

---

## 4. Immediate Development Steps
1.  **Framework Setup:** Initialize Next.js with the chosen dark-mode theme.
2.  **State Bus Scaffolding:** Create the SQLite schema for local persistence.
3.  **Core Tooling:** Build the MCP server for NewsAPI/SerpAPI integration.
4.  **Week 1 Curriculum Build:** Implement the "Country Intel" JSON validator tool.
