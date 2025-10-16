/* Comandos inicales para correr en consola y poder realizar pruebas */

import { Command } from "commander";

const program = new Command();

program
  .option("-s, --spec <file>", "Path to ProblemSpec JSON", "examples/input.json")
  .option("-c, --code <file>", "Path to user code (optional)")
  .option("-n, --num <n>", "Number of tests", "5")
  .option("--provider <name>", "mock|openai|gemini", "mock")
  .option("-o, --out <file>", "JSON outout file", "runs/output.json")
  .parse();

const opts = program.opts();

console.log("Output:", opts);
