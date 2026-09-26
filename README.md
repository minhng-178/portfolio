## <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a1628,50:1a3a5c,100:0d2137&height=200&section=header&text=Nguy%E1%BB%85n%20Vi%E1%BA%BFt%20Anh%20Minh&fontSize=45&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Mobile%20Developer%20%7C%202%2B%20Years%20Experience&descAlignY=58&descColor=38bdf8" width="100%" />

## 🚀 About Me

> **Mobile Developer** with **2+ years** of professional experience specializing in the **React Native ecosystem** (React, React Native, Redux-Saga, Zustand, Fastlane, Firebase) to engineer and deploy cross-platform mobile applications.

Proven track record of building main mobile applications directly from scratch, maintaining enterprise platforms, developing full-stack AI-integrated solutions, and publishing apps to both the **Apple App Store** and **Google Play**.

```
📱  Title: Mobile Developer (2+ Years Experience)
🎯  Core: React Native Ecosystem (React, React Native, Redux, Redux-Saga, Zustand, REST APIs, Fastlane, Firebase, Git)
🚀  Releases: Full App Store & Google Play publishing lifecycle via Fastlane
🤖  Workflows: AI-assisted development for full-stack integration & side projects
```

---

## 🛠️ Skills & Tech Stack

### 💻 Programming Languages

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

### 📱 Core Technologies

> **Chuyên sâu về hệ sinh thái React Native (bao gồm React, React Native, Redux, Redux-Saga, Zustand, RESTful APIs, Fastlane, Firebase, Git)**

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![React](https://img.shields.io/badge/React-282C34?style=for-the-badge&logo=react&logoColor=61DAFB)
![Redux](https://img.shields.io/badge/Redux-593D88?style=for-the-badge&logo=redux&logoColor=white)
![Redux Saga](https://img.shields.io/badge/Redux--Saga-999999?style=for-the-badge&logo=redux-saga&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=react&logoColor=white)
![REST API](https://img.shields.io/badge/REST_APIs-02569B?style=for-the-badge)
![Fastlane](https://img.shields.io/badge/Fastlane-00F200?style=for-the-badge&logo=fastlane&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

### 🌐 Applied & Familiar Technologies (Hiểu và vận dụng)

![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 🌍 Languages

| Language      | Level                                        |
| ------------- | -------------------------------------------- |
| 🇻🇳 Vietnamese | Native                                       |
| 🇬🇧 English    | TOEIC 830 — Professional Working Proficiency |

---

## 🏗️ How This Site Works

```
content/cv.md ─────────┐   CV facts — the single source of truth (edit here)
content/portfolio.yml ─┤   presentation: icons, stats, chatbot + site config
                       ▼
            npm run sync  →  data/cv_data.json  (generated, committed)
                       ├──►  ui/            static site on GitHub Pages
                       ├──►  server/        chat + contact API (FastAPI)
                       └──►  ui/resume.pdf  npm run resume, rendered by career-ops
                                            with content/resume-template/
```

- **career-ops** (local only, gitignored) is the CV engine. `npm run sync` links it to this repo:
  - `career-ops/cv.md → ../content/cv.md`. The CV Studio (career-ops web, branch `cv-studio`) writes through this link, so saving there edits `content/cv.md` directly, and its load/save cycle keeps the file's layout byte for byte. If some other tool replaces the link with a plain file, the next sync adopts those edits and restores the link.
  - `career-ops/templates/portfolio → ../../content/resume-template`, which registers the **Portfolio** CV template. It is the default in career-ops `config/profile.yml` (`cv.template`), so tailored CVs and `ui/resume.pdf` share one design. Colours and fonts go in the same file's `style:` block.
- **`npm run resume`** maps `content/cv.md` with the CV Studio's own modules, then runs `build-cv-html.mjs` and `generate-pdf.mjs`. That gives the resume ATS text normalisation, the section-order guard and the fact check against `cv.md`. Try another template with `npm run resume -- --template=modern`. In the CV Studio, pick a template under **career-ops Templates** to preview it live and export the same PDF.
- **CI** (`.github/workflows/ci.yml`) fails if `data/cv_data.json` is stale, runs the API tests, then deploys `ui/` to GitHub Pages from `main`.
- **Backend is optional.** With `site.api_base` empty in `portfolio.yml`, the chat widget stays hidden and the contact form uses Web3Forms (if `site.web3forms_access_key` is set) or a pre-filled `mailto:` link.

### Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install the sync tooling (once) |
| `npm run sync` | Rebuild `data/cv_data.json` after editing `content/` |
| `npm run resume` | Render `ui/resume.pdf` through career-ops (needs the clone) |
| `npm run dev` | Serve `ui/` at http://localhost:8080 |
| `npm run dev:api` | Run the API at http://localhost:8001 with `.env` (see `.env.example`) |
| `npm run test:api` | API test suite (`pip install -r server/requirements-dev.txt` first) |

### Backend configuration

The API is stateless and platform-agnostic: the chat talks to any **OpenAI-compatible** endpoint (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`; a local Ollama at `http://localhost:11434/v1` works too), and mail goes over SMTP. `server/Dockerfile` runs it on any container platform that injects `$PORT`. After deploying, set `ALLOWED_ORIGINS` to the site origin, `CLIENT_IP_HEADER` to the platform's client-IP header, and `site.api_base` in `portfolio.yml`.

---

<div align="center">

### 💬 Let's Connect & Build Something Great!

<a href="mailto:anhminh1782002@gmail.com">
  <img src="https://img.shields.io/badge/Email%20Me-EA4335?style=for-the-badge&logo=gmail&logoColor=white" />
</a>
<a href="https://www.linkedin.com/in/minhng178/">
  <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" />
</a>
<a href="https://github.com/minhng-178">
  <img src="https://img.shields.io/badge/Follow%20on%20GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
</a>

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d2137,50:1a3a5c,100:0a1628&height=120&section=footer" width="100%" />

</div>
