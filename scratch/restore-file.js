// [AI] Parse transcript log to find last state of invoice-customer/page.tsx
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8\\.system_generated\\logs\\transcript.jsonl';

async function findLatestState() {
  console.log("Reading transcript.jsonl...");
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestViewFileContent = null;
  let latestViewStep = -1;

  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      
      // Let's check for view_file on invoice-customer/page.tsx
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          if (tc.name === 'view_file') {
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            if (args.AbsolutePath && args.AbsolutePath.includes('invoice-customer')) {
              // This is a view_file call on our file.
              // Let's check the system response in the NEXT steps or check if it has the output.
              // Wait, the output might be in the same line or next line depending on the JSONL format.
              // In this system, the JSONL has step.output or step.content or tc.output.
              // Let's see what keys step has:
              if (step.output) {
                latestViewFileContent = step.output;
                latestViewStep = step.step_index;
              }
            }
          }
        }
      }

      // Check if it's a step of type 'VIEW_FILE' or has content with file contents
      if (step.type === 'VIEW_FILE' || step.type === 'view_file') {
        if (step.content && step.content.includes('HQInvoiceCustomerPage')) {
          latestViewFileContent = step.content;
          latestViewStep = step.step_index;
        }
      }

      if (step.output && step.output.includes('HQInvoiceCustomerPage')) {
        latestViewFileContent = step.output;
        latestViewStep = step.step_index;
      }
    } catch (e) {
      // Ignored
    }
  }

  console.log(`Latest view_file found at Step ${latestViewStep}`);
  if (latestViewFileContent) {
    console.log("File content length:", latestViewFileContent.length);
    // Write it to a temporary file to inspect
    fs.writeFileSync('scratch/restored_content.txt', latestViewFileContent);
    console.log("Saved to scratch/restored_content.txt");
  } else {
    console.log("No view_file content found.");
  }
}

findLatestState();
