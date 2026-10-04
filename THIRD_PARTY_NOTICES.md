# Third-party notices

Things itself is MIT licensed (see [LICENSE](LICENSE)). It includes or loads the following. Each keeps its own license.

| Component | Where | License |
|---|---|---|
| [three.js](https://threejs.org) r128, Copyright 2010-2021 Three.js Authors | `public/three.min.js` (pinned copy; the license header is inside the file) | MIT |
| [Next.js](https://nextjs.org), Copyright Vercel, Inc. | npm dependency | MIT |
| [React](https://react.dev) and React DOM, Copyright Meta Platforms, Inc. | npm dependency | MIT |
| Caveat, Jost, Instrument Sans | loaded at runtime from [Google Fonts](https://fonts.google.com); not copied into this repository | SIL Open Font License 1.1 (see each family's page on Google Fonts) |

The full license texts for npm dependencies ship inside each package in `node_modules/`. Run `npx license-checker --summary` for a complete list of transitive licenses before redistributing a build.

If you spot a missing or wrong notice, please open an issue.
