import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import readline from "node:readline/promises";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const messages = [
        {
            role: "system",
            content: `You are Hirdika, a smart assistant who can answer questions. 
            You have access to the following tools:
            1. websearch({query}: {query: String}) //Search the latest information and realtime data on the internet.
            Current datetime: ${new Date().toUTCString()}
            `,
        },
    ];

    while (true) {
        const question = await rl.question("YOU: ");

        if (question.toLowerCase() === "exit") {
            console.log("Bye!");
            rl.close();
            process.exit(0);
        }

        messages.push({ role: "user", content: question });

        while (true) {
            const completion = await groq.chat.completions.create({
                temperature: 0,
                model: "llama-3.3-70b-versatile",
                messages,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "websearch",
                            description: "Search the latest information and realtime data on the internet.",
                            parameters: {
                                type: "object",
                                properties: {
                                    query: {
                                        type: "string",
                                        description: "The search query to perform search on.",
                                    },
                                },
                                required: ["query"],
                            },
                        },
                    },
                ],
                tool_choice: "auto",
            });

            const msg = completion.choices[0].message;
            const toolCalls = msg.tool_calls;

            if (!toolCalls) {
                console.log(`Assistant: ${msg.content}`);
                messages.push(msg);
                break;
            }

            // Store assistant’s tool call msg once
            messages.push(msg);

            for (const tool of toolCalls) {
                const functionName = tool.function.name;
                const functionArgs = JSON.parse(tool.function.arguments);

                if (functionName === "websearch") {
                    console.log(`Assistant is searching for: ${functionArgs.query}`);
                    const toolResult = await websearch(functionArgs);

                    messages.push({
                        role: "tool",
                        tool_call_id: tool.id,
                        name: functionName,
                        content: JSON.stringify(toolResult),
                    });
                }
            }
        }
    }
}

main();

async function websearch({ query }) {
    const response = await tvly.search(query);
    return response;
}
