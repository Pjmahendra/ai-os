import {
  N8NExecuteTool
} from "./index.js";

const tool = new N8NExecuteTool();

const result = await tool.execute(
  {
    message: "Hello from AI-OS",
    source: "n8n-tool-test"
  },
  {}
);

console.log("n8n result:");
console.log(result);
