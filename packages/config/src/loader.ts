import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve apps/api/.env relative to this module's own location on
// disk, not process.cwd(). This package always lives at
// packages/config/{src,dist} in the monorepo, so the relative path to
// apps/api/.env is stable regardless of where the process was
// launched from — cwd is NOT stable: `npm run dev` from the repo
// root, from apps/api directly, or via turbo (which runs each
// package's script with that package's directory as cwd) all resolve
// differently if we depend on cwd, and only one of those cases
// happened to work before.
const moduleDir = path.dirname(
  fileURLToPath(import.meta.url)
);

const envPath = path.resolve(
  moduleDir,
  "../../../apps/api/.env"
);

dotenv.config({
  path: envPath
});
