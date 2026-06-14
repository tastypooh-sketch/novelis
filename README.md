
# NOVELIS 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-7.7.05-green.svg)
![Status](https://img.shields.io/badge/status-stable-success.svg)

**Novelis** redefines digital storytelling by fusing a distraction-free, horizontal "infinite spread" interface with a deeply integrated, context-aware AI engine. Unlike traditional corkboarding software where AI is merely an add-on, Novelis is architected from the ground up as a responsive "Novel Operating System." 

The editor maximizes screen real estate, allowing text to flow naturally across a cinematic dual-pane view, while the underlying intelligence actively cross-links every element of your manuscript. As you draft, Novelis analyzes chapters to dynamically update character profiles, visualize pacing heatmaps, and detect plot holes in real-time. It bridges the gap between immersive writing and structural engineering, offering a brainstorming partner that understands the interconnected DNA of your story.

**Note on AI Costs: Novelis uses a "Bring Your Own Key" model. Most authors stay entirely within Google's generous Free Tier, meaning you can likely write and analyze your entire novel for $0.00.**

Built with **React**, **Electron**, and **Google Gemini 2.5/3.0**.

---

## 🌟 Key Features

### 1. Hybrid Architecture
*   **Novelis Desktop:** The full "Command Center" for outlining, world-building, and drafting.
*   **Nové (Portable):** Generates a single-file, offline HTML word processor (`Nové.html`) that contains your entire manuscript. Write on any device with a browser, then sync back to Desktop.

### 2. Manuscript Mode
*   **Distraction-Free:** Horizontal "Infinite Spread" layout that mimics a book.
*   **Voice-Aware AI Assist:** Drag-and-drop text analysis that learns your specific style, tone, and pacing.
*   **Beta Reader Simulator:** Get feedback from simulated personas (e.g., "Cynical Critic", "Romance Reader").
*   **Smart Tools:** Text-to-Speech with neural voices, typewriter sound engine, and focus mode.

### 3. Assembly Mode (The Structural Engine)
*   **Chapter Board:** Kanban-style outlining with a "Pacing Heatmap" to visualize narrative tension.
*   **Character Cast:** AI-generated profiles, photorealistic headshots, and relationship mapping.
*   **Snippet Repository:** A "scrapbook" for loose ideas, auto-tagged and suggested for specific chapters.
*   **World Building Crucible:** Dump raw notes and let the AI distill them into a structured Codex.
*   **Social Media Studio:** Automatically generates Instagram/TikTok captions and visual hooks based on your actual manuscript content.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   A **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/novelis.git
    cd novelis
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in Development Mode**
    ```bash
    npm run electron:dev
    ```

### Building for Production

You can build for specific platforms or all at once. Note that cross-compiling (e.g., building Windows on Mac) may require additional tools like Wine.

```bash
# Build All (Mac, Windows, Linux)
npm run electron:build:all

# Windows Only
npm run electron:build:win

# macOS Only
npm run electron:build:mac

# Linux Only
npm run electron:build:linux
```

Output files will be generated in the `dist-electron` folder.

---

## 🧠 AI Configuration

Novelis utilizes the Google GenAI SDK. To use the AI features:
1.  Launch the app.
2.  Go to **Customize Toolbar** (Cog Icon).
3.  Enter your Google Gemini API Key.
4.  The key is stored locally on your device (`localStorage`).

---

## 🛠️ Tech Stack

*   **Frontend:** React 19, Vite, Tailwind CSS
*   **Backend/Shell:** Electron 31
*   **AI:** @google/genai (Gemini 2.5 Flash, Gemini 3.0 Pro, Imagen 3)
*   **State Management:** React Context + Immer
*   **Data Handling:** JSZip (for portable sync), DOCX export

---

## 📄 License

This project is open source. See [LICENSE](LICENSE) for details.
