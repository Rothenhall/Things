---
path: /self-hosting
title: Host Things yourself
description: Run the studio, chat widget and AI-traffic dashboard on your own server or PC.
---

# Host Things yourself

Things needs only Node.js 20.12 or newer. There is no database to install.

## Which setups are supported?

There are two. In the all-in-one setup you run the Next.js app and everything lives in one place. In the embed setup the widget script is loaded from a deployed Things site but chat messages and logs go to a small collector server that you run on your own computer or server.

## How do I run the collector on my own PC?

Copy .env.example to .env, set ADMIN_TOKEN and ALLOWED_ORIGINS, then run npm run collector. It listens on port 8787. To let the public internet reach your PC, expose that port with a tunnel such as Cloudflare Tunnel or Tailscale Funnel.

## Where is the data stored?

In plain JSON lines files in the data folder: questions.jsonl, bot-hits.jsonl and visits.jsonl. Back it up by copying the folder.

## How do I add content for the chat to answer from?

Put markdown files in the content folder. The chat answers only from that content, from a crawled sitemap if you set CONTENT_SITEMAP, or both.

## Which AI providers are supported?

Any OpenAI-compatible API, including local models through Ollama, and the Anthropic API. Without a provider the chat quotes the best matching passage.
