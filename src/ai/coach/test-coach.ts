import { buildCoachPrompt } from "../prompts/coach.prompt";
import { runCoachExplain } from "../coach/explain-runner";
import { CoachContext } from "../prompts/types";

async function main() {
    const context: CoachContext = {
        problemStatement: "Dados N números, imprimir la suma.",
        examples: "input: 3\n1 2 3 output: 6",
        verdict: "WA",
        stderr: "Expected 6, got 5",
        failingTestInput: "none",
    };

    const response = runCoachExplain(context);

    console.log("*/************************************/*")
    console.log(response);
}

main();
