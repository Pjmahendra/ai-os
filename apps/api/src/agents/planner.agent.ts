export interface Plan {
  goal: string;
  steps: string[];
}

export function createPlan(userMessage: string): Plan {
  return {
    goal: userMessage,
    steps: [
      "Understand the user's request",
      "Decide if a tool is needed",
      "Generate the best response"
    ]
  };
}
