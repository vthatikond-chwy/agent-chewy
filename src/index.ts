import { NLParser } from './core/nlParser.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const parser = new NLParser(process.env.OPENAI_API_KEY!);
  const plan = await parser.parse("Go to Google and search for playwright");
  console.log(JSON.stringify(plan, null, 2));
}

main();

