// [AI] Print tool call arguments for step 38, 46, 50, 58, 214
const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8\\.system_generated\\logs\\transcript.jsonl';

async function printStepEdits() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const targetSteps = [38, 46, 50, 58, 214];

  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      if (targetSteps.includes(step.step_index)) {
        console.log(`\n================ STEP ${step.step_index} (${step.type}) ================`);
        if (step.tool_calls) {
          step.tool_calls.forEach((tc, idx) => {
            console.log(`Tool Call ${idx}: ${tc.name}`);
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            if (args.ReplacementChunks) {
              console.log(`ReplacementChunks: ${JSON.stringify(args.ReplacementChunks).substring(0, 1000)}...`);
            } else if (args.CodeContent) {
              console.log(`CodeContent: ${args.CodeContent.substring(0, 1000)}...`);
            } else {
              console.log(`Args: ${JSON.stringify(args).substring(0, 1000)}...`);
            }
          });
        }
        if (step.content) {
          console.log(`Content (first 500 chars): ${step.content.substring(0, 500)}`);
        }
      }
    } catch (e) {
      // Ignored
    }
  }
}

printStepEdits();
