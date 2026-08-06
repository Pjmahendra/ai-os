import axios from "axios";

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "qwen3:4b";

export async function chat(prompt: string): Promise<string> {
  const { data } = await axios.post(OLLAMA_URL, {
    model: MODEL,
    prompt,
    stream: false
  });

  return data.response;
}