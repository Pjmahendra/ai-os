import "./loader.js";
import { ConfigSchema } from "./schema.js";

export const env = ConfigSchema.parse(process.env);

export type Env = typeof env;