# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- **Chat widget** (`public/things-chat.js`): a Things character that answers visitor questions from your content. Embeddable on any site with one script tag; isolated in a shadow root; falls back to a button without WebGL.
- **Content gaps**: unanswered questions are logged, grouped and ranked, with a copy-ready prompt list for testing in ChatGPT and Perplexity.
- **AI traffic analytics**: AI crawler detection (GPTBot, ClaudeBot, PerplexityBot and more), pages read vs requested-but-missing, and visits from AI answers with time on page and bounce.
- **Agent-readable site**: `llms.txt`, `llms-full.txt`, markdown pages (`/md/<path>`, `.md`, `Accept: text/markdown`, and automatically for AI crawlers), JSON-LD (`WebSite`, `WebPage`, `FAQPage`), `robots.txt`, `sitemap.xml`, and an HTML twin for every content file.
- **Admin dashboard** at `/admin` with CSV/JSON/text export.
- **Standalone collector** (`npm run collector`, no dependencies) so the widget can be loaded from a deployed Things site while data stays on your own machine; Cloudflare Worker snippet and access-log importer for sites without middleware.
- Self-hosting: `.env.example`, `Dockerfile`, `docker-compose.yml`, `docs/SELF_HOSTING.md`, `docs/EMBEDDING.md`, `docs/AGENT_READINESS.md`.
- Open source project files: contributing guide, code of conduct, security policy, third-party notices, issue and PR templates, CI, CodeQL, Dependabot, importable GitHub rulesets, GHCR image release workflow.
- Tests (`npm test`, built-in `node:test`) and `npm run check`.

### Changed

- `package.json`: `engines`, `bugs`, `homepage`, and new scripts.
