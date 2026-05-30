// [AI] Print sample lines from transcript.jsonl
const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8\\.system_generated\\logs\\transcript.jsonl';

async function printSample() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    count++;
    if (count <= 10) {
      console.log(`--- Line ${count} ---`);
      console.log(line.substring(0, 1000));
    } else {
      break;
    }
  }
}

printSample();
