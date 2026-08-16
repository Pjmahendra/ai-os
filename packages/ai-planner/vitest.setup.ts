// @ai-os/ai-runtime transitively imports @ai-os/config, which validates
// process.env eagerly at module load time. Tests here never make a real
// network call (they inject a fake LLMProvider), but the import graph
// still needs these to exist to avoid a ZodError before any test runs.
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET ??=
  "test-secret-test-secret-test-secret-32chars";
process.env.OPENROUTER_API_KEY ??= "test-key";
