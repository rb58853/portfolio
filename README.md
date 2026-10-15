# Portfolio — Raúl Beltrán Gómez

Personal portfolio and interactive CV built with **React 18**.  
Live: [rb58853.github.io/CV](https://rb58853.github.io/CV)

---

## Features

- **Multi-section SPA** — Home, About, Experience, Projects, Skills, Contributions, and Contact.
- **Theme switcher** — dark / light mode with CSS custom properties.
- **AI chat assistant** — WebSocket-based assistant that answers questions about the CV.
- **GitHub contributions graph** — fetches real contribution data via the GitHub API.
- **Responsive layout** — fluid grid that adapts from mobile to widescreen.
- **React Router v6** — client-side routing with animated page transitions.
- **Redux Toolkit** — global state for sections, contributions, and WebSocket lifecycle.

## Tech stack

| Layer | Library / Tool |
|-------|---------------|
| UI | React 18, JSX |
| State | Redux Toolkit, React-Redux |
| Routing | React Router DOM v6 |
| Styling | Plain CSS (no preprocessor), CSS custom properties |
| HTTP | Axios |
| Markdown | react-markdown + remark-gfm |
| Icons | @iconify/react |
| Build | Create React App (react-scripts 5) |
| Serve | nginx 1.27-alpine (Docker) |

---

## Getting started

### With Docker (recommended for production)

See [Quickstart.MD](Quickstart.MD) for a step-by-step guide.

```bash
cp .env.example .env   # fill in your tokens
docker compose up --build -d
# → http://localhost:3000
```

### Local development

**Prerequisites:** Node.js ≥ 18, npm ≥ 9.

```bash
npm install
cp .env.example .env   # optional — app works without tokens
npm start              # http://localhost:3000
```

### Production build (no Docker)

```bash
npm run build
# Serve the build/ folder with any static file server
npx serve -s build
```

After `react-scripts build`, [scripts/prerender.mjs](scripts/prerender.mjs) writes one HTML file per route (`projects.html`, `about.html`…) with its own title, description, canonical URL and page text, plus `sitemap.xml`, so search engines and link previews get real content without running JavaScript. Site-wide meta tags, Open Graph and the JSON-LD profile live in [public/index.html](public/index.html); a new route needs an entry in the script.

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_GITHUB_TOKEN` | GitHub token for contribution graph | *(disabled if empty)* |
| `REACT_APP_CHAT_TOKEN` | Auth token for the AI chat assistant | *(disabled if empty)* |
| `PUBLIC_URL` | Base URL path for assets and routing | `/` |

Copy `.env.example` to `.env` and fill in values before building.

> **Security** — `REACT_APP_*` variables are embedded at build time into the JS bundle. Never store highly sensitive secrets here; use read-only, scoped tokens only.

---

## Project structure

```
src/
├── aiChatAssistant/     # WebSocket chat UI and logic
├── components/          # Section components (Home, About, Projects …)
├── environment/         # Static data (projects, skills, experience …)
│   ├── data/
│   └── styles/          # dark.css / light.css theme files
├── hooks/               # Custom React hooks
├── options/             # Theme toggle UI
├── preferences/         # Theme context provider
├── redux/               # Redux slices and store
├── routes/              # Route definitions
└── styles/              # Global and responsive CSS
```

---

## Deployment

### GitHub Pages

```bash
npm run deploy           # runs build then gh-pages -d build
```

The `homepage` field in `package.json` is set to `https://rb58853.github.io/CV`.

### Docker / VPS

```bash
docker compose up --build -d
```

For HTTPS, terminate TLS at a reverse proxy (nginx, Traefik, Caddy) and proxy to the container on port 3000.

---

## License

MIT © Raúl Beltrán Gómez

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
