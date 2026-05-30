// [AI] Print full tool call arguments for Step 38
const fs = require('fs');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8\\.system_generated\\logs\\transcript.jsonl';

async function printStep38() {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const step = JSON.parse(line);
    if (step.step_index === 38) {
      console.log("Found Step 38!");
      console.log(JSON.stringify(step.tool_calls, null, 2));
    }
  }
}

printStep38();
