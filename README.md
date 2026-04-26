<div align="center">


# MarkdownPDF

**A blazingly fast, privacy-first, browser-native Markdown to PDF converter.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)

[**Launch App**](https://markdownpdf.pages.dev/editor) • [**Report Bug**](https://github.com/ayhamDev/MarkdownPDF/issues) • [**Buy me a coffee**](https://ko-fi.com/ayhamdev)

</div>

---

## ✨ Overview

**MarkdownPDF** is a powerful document creation tool designed to bridge the gap between simple Markdown writing and professional PDF publishing. Unlike other converters that rely on server-side rendering or blurry canvas snapshots, MarkdownPDF uses **native browser orchestration** to generate flawless, selectable-text vector PDFs.

### 🚀 [Try the Live Editor here](https://markdownpdf.pages.dev/editor)

---

## 🔥 Key Features

-   **Pro-Level Editor:** Integrated **Monaco Editor** (the engine behind VS Code) with full syntax highlighting, auto-completion, and multi-page support.
-   **True Vector Export:** Utilizes CSS `@page` rules to generate high-fidelity PDFs directly through the browser engine. Text remains selectable and resolution is infinite.
-   **AI Copilot (Gemini):** A built-in AI assistant to help you rewrite, summarize, or generate content. **Privacy First:** Bring your own API key to keep data at-cost and private.
-   **Aesthetic Themes:** Choose from professionally designed themes like *Sleek*, *Dracula*, *Terminal*, *Midnight*, and more.
-   **Typography Tuning:** Granular control over font sizes, line heights, and paddings for every element (H1, H2, H3, P).
-   **Math & Tables:** Full support for **KaTeX** math equations and GitHub Flavored Markdown (GFM) tables.
-   **100% Privacy:** No server uploads. Your data is stored in your browser's `localStorage` and processed entirely on your machine.

---

## 🛠️ Tech Stack

-   **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Typography Plugin)
-   **Editor:** [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
-   **Markdown Engine:** [react-markdown](https://github.com/remarkjs/react-markdown) with Remark/Rehype plugins
-   **AI Integration:** [Google Generative AI (Gemini)](https://ai.google.dev/)
-   **Animations:** [Motion](https://motion.dev/)

---

## 💻 Local Development

### Prerequisites
-   [Node.js](https://nodejs.org/) (Latest LTS recommended)
-   npm or yarn

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ayhamDev/MarkdownPDF.git
    cd MarkdownPDF
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env.local` file in the root directory:
    ```text
    GEMINI_API_KEY="your_api_key_here"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the app:**
    Navigate to `http://localhost:3000` in your browser.

---

## 🤖 Using the AI Features

To keep this tool free and private, the AI features require your own **Google Gemini API Key**.

1.  Get a free key from the [Google AI Studio](https://aistudio.google.com/).
2.  In the MarkdownPDF app, click the **Settings** icon.
3.  Paste your key into the **API Key** field.
4.  Open the **AI Chat** drawer and start drafting!

---

## 🔒 Privacy Policy

MarkdownPDF is a **serverless** application. 
-   **No Content Tracking:** Your documents are never uploaded to our servers.
-   **Local Storage:** Documents are saved to your browser's local storage.
-   **Direct AI Link:** When using the AI feature, data is sent directly to Google Gemini APIs. We do not intercept or log your prompts.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## ☕ Support

If MarkdownPDF helped you save time or create something beautiful, consider supporting the developer:

<a href="https://ko-fi.com/ayhamdev" target="_blank"><img src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy Me A Coffee" style="height: 45px !important;width: 180px !important;"></a>

---

**Built with ❤️ by [AyhamDev](https://github.com/ayhamDev)**
