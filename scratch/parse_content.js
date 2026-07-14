const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\sonad\\.gemini\\antigravity\\brain\\68682979-08c3-4640-9360-801e9eb4c96d\\.system_generated\\steps\\134\\content.md', 'utf8');

console.log('Contains Perusahaan Logistics:', content.includes('Perusahaan Logistics'));
console.log('Contains Company Name:', content.includes('Company Name'));
console.log('Contains HALU:', content.includes('HALU'));
console.log('Contains 78846049-fb63-45a9-93da-3af3fea5b587:', content.includes('78846049-fb63-45a9-93da-3af3fea5b587'));
