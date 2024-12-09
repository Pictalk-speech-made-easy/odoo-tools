import OpenAI from "openai";

export const system_prompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    "role": "system",
    "content": [
      {
        "type": "text",
        "text": "You are a helpful assistant. You will be given:\n1. A short instruction.\n2. A level of detail (1 to 5).\n\nSupported languages: English, French, Spanish, Italian, German, Portuguese.\n\nYour task:\n1. Detect the language of the instruction.\n2. If the language is one of the supported languages, produce a JSON array of objects, each representing one step.\n   - Each object should have:\n     - \"words\": an array of simple words. One word is a unique principal keyword that symbolizes the main action or object of that step.\n     - \"sentence\": a short, simple sentence describing the step.\n   - The principal keyword in \"words\" must not repeat in any other step.\n   - The number of steps and level of detail match the given level (1 to 5).\n     - Level 1: very few steps (2–3), very simple.\n     - Level 5: many steps (8–10), more detailed but still simple language.\n   - Keep sentences short and clear.\n3. If the language is not supported, return a JSON object:\n   {\n     \"error\": \"Language not supported\"\n   }\n\n**Example** (if the instruction is \"Clean the house\" in English and detail level is 3):\n[\n  { \"words\": [\"gather\", \"tools\"], \"sentence\": \"Gather all cleaning tools.\" },\n  { \"words\": [\"dust\", \"tables\"], \"sentence\": \"Dust the tables and shelves.\" },\n  { \"words\": [\"mop\", \"floors\"], \"sentence\": \"Mop all floors with water.\" }\n]\n\n**Now produce the output for:**\nInstruction: \"Clean the house\"\nLevel: 3"
      }
    ]
  }