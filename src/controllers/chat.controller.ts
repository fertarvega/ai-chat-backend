import { Request, response, Response } from "express";
import Groq from "groq-sdk";
import redis_db from "../databases/redisConnection";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const instructionsPrompt =
  "Instructions: Respond in markdown format, with the following rules: - Use # for headers - Use * for bold - Use _ for italic - Use ~ for strikethrough - Use ` for code - Use ``` for code blocks - Use [text](url) for links - Use > for quotes - Use 1. 2. 3. for numbered lists - Use - for unnumbered lists. User: Explain the importance of fast language models";

export async function getGroqChatCompletion(req: Request, res: Response) {
  const { prompt, uuid } = req.body;

  const conversationHistory: any[] = (await redis_db.get(uuid)) || [];

  res.setHeader("Content-Type", "application/stream+json");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");
  res.flushHeaders();

  if (conversationHistory.length === 0) {
    conversationHistory.push({
      role: "user",
      content: instructionsPrompt,
    });
  }

  conversationHistory.push({
    role: "user",
    content: prompt,
  });

  const chatCompletion = await groq.chat.completions.create({
    messages: conversationHistory,
    model: "llama-3.3-70b-versatile",
    stream: true,
  });

  let content = "";
  for await (const chunk of chatCompletion) {
    const newContent = chunk.choices[0]?.delta?.content || "";
    content += newContent;
    res.write(
      `data: ${JSON.stringify({
        response: newContent,
        done: false,
      })}\n\n`
    );
  }

  res.write(
    `data: ${JSON.stringify({
      response: "",
      done: true,
    })}\n\n`
  );

  conversationHistory.push({
    role: "assistant",
    content: content,
  });

  redis_db.set(uuid, JSON.stringify(conversationHistory));
  res.end();
}

export const deleteChatDB = async (req: Request, res: Response) => {
  try {
    const { uuid } = req.query;
    console.log(uuid);

    if (!uuid) {
      return res.status(400).json({ message: "Bad request, needs uuid" });
    }
    redis_db.del(uuid as string);
    res.status(200).json({ message: "Deleted on db" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const createTitle = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const messages = [
      {
        role: "user",
        content:
          "The answer must be in the prompt user language. Only respond with the title of the prompt. Need to be a single sentence, not a question. The sentence should be around 10 words and about the topic of the prompt.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const titleCompletion = await groq.chat.completions.create({
      messages: messages as ChatCompletionMessageParam[],
      model: "llama-3.3-70b-versatile",
      max_tokens: 50,
    });

    const title = titleCompletion.choices[0]?.message?.content || "New Chat Title";

    res.status(200).json({ title });
  } catch (error) {
    console.error("Error generating title:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

