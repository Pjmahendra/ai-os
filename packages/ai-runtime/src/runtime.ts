import {
    createLLMProvider,
    type LLMMessage,
    type LLMProvider,
    type LLMMode
} from "@ai-os/ai-llm";

import type {
    RuntimeRequest,
    RuntimeResponse
} from "./types.js";

export class AIRuntime {
    private readonly llm: LLMProvider;

    constructor(
        llm?: LLMProvider,
        mode: LLMMode = "auto"
        ) {
        this.llm = llm ?? createLLMProvider(mode);
    }

    async run(
        request: RuntimeRequest
    ): Promise<RuntimeResponse> {
        const messages: LLMMessage[] = [];

        if (request.systemPrompt !== undefined) {
        messages.push({
            role: "system",
            content: request.systemPrompt
        });
    }

        if (request.conversation !== undefined) {
        messages.push(...request.conversation);
        }

        messages.push({
        role: "user",
        content: request.message
        });

        const response = await this.llm.chat({
        messages
        });

        return {
        content: response.content,
        model: response.model
        };
    }
}