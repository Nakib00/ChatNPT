import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // 24 hours

export async function generate(userMessage, threadId) {
    const basemessages = [
        {
            role: "system",
            content: `
                You are ChatNGT, a helpful and smart assistant.
                You can use tools when needed.
                You have access to:
                1. websearch({query: string}) -> Find latest or real-time info online.

                Guidelines:
                - If user asks about real-time, location-based, or news-related info -> call websearch.
                - After getting results, summarize clearly in natural language, not raw JSON.
                - Always be conversational, short, and clear.
                - Mention the source (URL) only if it's useful.
                - If the answer is general knowledge, reply directly without using tools.

                Current datetime: ${new Date().toUTCString()}

                Examples:

                User: What is the time now in Dhaka?
                Assistant: The current time in Dhaka is 8:05 PM, Friday. (source: timeanddate.com)

                User: Who is the president of Bangladesh?
                Assistant: The president of Bangladesh is Mohammed Shahabuddin. (source: official govt site)

                User: What is 25 + 17?
                Assistant: That's 42, no search needed.

                User: Tell me a fun fact about cats.
                Assistant: Cats can make over 100 different sounds, unlike dogs who make around 10.
            `,
        },
    ];

    let messages = cache.get(threadId) ?? basemessages;
    messages.push({ role: "user", content: userMessage });

    const tools = [
        {
            type: "function",
            function: {
                name: "websearch",
                description: "Search the latest information and real-time data on the internet.",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to perform.",
                        },
                    },
                    required: ["query"],
                },
            },
        },
    ];

    try {
        let maxIterations = 5;
        let currentIteration = 0;

        while (currentIteration < maxIterations) {
            currentIteration++;

            const completion = await groq.chat.completions.create({
                temperature: 0,
                model: "llama-3.1-8b-instant",
                messages,
                tools,
                tool_choice: "auto",
            });

            const msg = completion.choices[0].message;

            if (msg.tool_calls && msg.tool_calls.length > 0) {
                messages.push({
                    role: "assistant",
                    tool_calls: msg.tool_calls,
                });

                for (const toolCall of msg.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    let toolResponse;

                    if (functionName === "websearch") {
                        toolResponse = await websearch(functionArgs);
                    } else {
                        toolResponse = `Error: Unknown function: ${functionName}`;
                    }

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: functionName,
                        content: toolResponse,
                    });
                }
            } else if (msg.content) {
                messages.push({ role: "assistant", content: msg.content.trim() });
                cache.set(threadId, messages);
                // console.log("Cache updated:", cache.get(threadId));
                return msg.content.trim();
            } else {
                return "I couldn't generate a proper response.";
            }
        }
    } catch (error) {
        // console.error("Error in generate function:", error);
        return `An error occurred: ${error.message}`;
    }

    return "Maximum iterations reached. Please try again with a simpler query.";
}


// Correctly defined async websearch function
async function websearch({ query }) {
    try {
        // console.log(`Starting search for: ${query}`);

        if (!process.env.TAVILY_API_KEY) {
            throw new Error("TAVILY_API_KEY environment variable is not set");
        }

        const response = await tvly.search(query, {
            max_results: 5,
            include_raw_content: false,
        });

        if (!response || !response.results || response.results.length === 0) {
            return `No search results found for "${query}".`;
        }

        const searchResults = response.results.slice(0, 5).map((result) => ({
            title: result.title || "No title",
            content: result.content || "No content available",
            url: result.url || "",
            publishedDate: result.published_date || null,
        }));

        let formattedResults = `Search results for "${query}":\n\n`;
        searchResults.forEach((result, index) => {
            formattedResults += `${index + 1}. **${result.title}**\n`;
            formattedResults += `   Content: ${result.content.substring(0, 200)}${result.content.length > 200 ? "..." : ""}\n`;
            formattedResults += `   URL: ${result.url}\n\n`;
        });

        return formattedResults;
    } catch (error) {
        // console.error("Search error details:", error);
        return `An error occurred during web search: ${error.message}`;
    }
}