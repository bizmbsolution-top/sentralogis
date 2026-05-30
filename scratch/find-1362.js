// [AI] Find where 1362 was matched
const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8\\.system_generated\\logs\\transcript.jsonl';

async function find1362() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('1362') || line.includes('1,362')) {
      const step = JSON.parse(line);
      console.log(`\nStep ${step.step_index} (${step.type}):`);
      console.log(line.substring(0, 2000));
    }
  }
}

find1362();
