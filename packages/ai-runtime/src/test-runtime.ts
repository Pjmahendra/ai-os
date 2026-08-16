import { AIRuntime } from "./runtime.js";

const runtime = new AIRuntime(
  undefined,
  "offline"
);;

const response = await runtime.run({
  message: "Explain what AI-OS is in one simple sentence."
});

console.log("\nModel:", response.model);
console.log("Response:", response.content);