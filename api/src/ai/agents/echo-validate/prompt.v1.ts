export default function prompt(input: Record<string, unknown>): string {
  return `You are a health-check agent. Return a JSON object with key "echo" containing the value of input.message. Example: {"echo": "hello"}. Input: ${JSON.stringify(input)}`;
}
