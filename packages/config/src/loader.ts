import dotenv from "dotenv";
import path from "node:path";

const envPath = path.resolve(
  process.cwd(),
  "apps/api/.env"
);

dotenv.config({
  path: envPath
});