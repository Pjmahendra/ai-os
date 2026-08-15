// ./src/config/env.ts validates process.env eagerly at import time via
// zod. The pure-logic unit tests in this package don't touch a real
// database or LLM provider, but anything that transitively imports
// config still needs these to exist to avoid a ZodError before any
// test runs.
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET ??=
  "test-secret-test-secret-test-secret-32chars";
process.env.OPENROUTER_API_KEY ??= "test-key";
