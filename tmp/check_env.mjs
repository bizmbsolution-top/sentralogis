import { readFileSync } from 'fs';

const envText = readFileSync('.env.local', 'utf8');
console.log('=== .env.local ===');
console.log(envText);
