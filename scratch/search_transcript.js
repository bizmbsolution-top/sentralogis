const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\sonad\\.gemini\\antigravity\\brain\\68682979-08c3-4640-9360-801e9eb4c96d\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  if (!fs.existsSync(logPath)) {
    console.error('File does not exist:', logPath);
    return;
  }
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        console.log(`[USER] (Step ${obj.step_index}): ${obj.content}`);
      } else if (obj.type === 'PLANNER_RESPONSE') {
        // Look for tool calls or specific text
        if (obj.content && (obj.content.toLowerCase().includes('send') || obj.content.toLowerCase().includes('kirim'))) {
          console.log(`[ASSISTANT] (Step ${obj.step_index}): ${obj.content.substring(0, 150)}...`);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }
}
run();
