export default {
  reactStrictMode: false,
  // The chat and the agent-readable pages read content/*.md at request time. Serverless hosts
  // only ship files the build can trace, so include the folder explicitly.
  outputFileTracingIncludes: { '/**': ['./content/**/*'] }
};
