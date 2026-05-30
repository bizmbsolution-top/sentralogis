// [AI] Extract step content from transcript.jsonl
const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8\\.system_generated\\logs\\transcript.jsonl';

async function extractStep() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const step = JSON.parse(line);
    // Let's print any view_file action output on page.tsx
    if (step.tool_calls) {
      step.tool_calls.forEach(tc => {
        if (tc.name === 'view_file') {
          console.log(`Step ${step.step_index} called view_file:`, tc.args);
        }
      });
    }
    
    // Check if the output of a view_file is in the step or next step
    if (step.type === 'VIEW_FILE' || step.type === 'view_file' || (step.content && step.content.includes('Showing lines 1 to 800'))) {
      console.log(`Step ${step.step_index} is a view_file output, content length:`, step.content.length);
      fs.writeFileSync(`scratch/step-${step.step_index}-content.txt`, step.content);
      console.log(`Saved step-${step.step_index}-content.txt`);
    }
    
    if (step.output && step.output.includes('Showing lines 1 to 800') && step.output.includes('HQInvoiceCustomerPage')) {
      console.log(`Step ${step.step_index} is a view_file output in output key, content length:`, step.output.length);
      fs.writeFileSync(`scratch/step-${step.step_index}-output.txt`, step.output);
      console.log(`Saved step-${step.step_index}-output.txt`);
    }
  }
}

extractStep();
