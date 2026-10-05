---
path: /faq
title: Things FAQ
description: Answers to common questions about Things, the plush character editor.
type: faq
---

# Frequently asked questions

## What is Things?

Things is a free, open source editor for 3D plush characters. You change the fur, face and outfit, then boop the character to see it squish and ripple.

## Is Things free?

Yes. It is MIT licensed, with no paid tier, no account and no telemetry.

## How do I run Things myself?

Clone the repository, run npm install, then npm run dev and open http://localhost:3000. For production run npm run build and npm start, or use the Docker image described in the self-hosting guide.

## How do I add a character to my own website?

Load three.js r128 and things.umd.js with script tags, then call Things.mount on an element with a preset name or a config object. The studio's Use it button, next to Photo, generates the snippet for you.

## Can I use a character as a chat assistant on my site?

Yes. Add the chat widget script to your page. A visitor asks a question in the character's speech bubble and it answers from your site's content. The widget can send its data to a collector server that you host yourself.

## What happens to questions the chat cannot answer?

They are saved to a log of content gaps that you can read in the admin dashboard. Each gap shows how often it was asked, so you can write the missing page or FAQ entry.

## Can I see which AI crawlers visit my site?

Yes. The admin dashboard lists hits from AI crawlers such as GPTBot, ClaudeBot and PerplexityBot, which pages they read, which paths they requested that do not exist, and how visitors referred from ChatGPT, Perplexity or Claude behaved.

## Does Things send my data anywhere?

Things has no telemetry and the server never contacts Rothenhall. Pages load fonts from Google Fonts, which you can replace with self-hosted fonts. Chat questions and traffic logs are written to a folder on the server you run. If you configure an LLM provider, the visitor question and the matching passages are sent to that provider to write the answer.

## Which browsers does Things support?

Any modern browser with WebGL.
