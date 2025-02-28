import axios from "axios";
import { Request, response, Response } from "express";
import redis_db from "../src/databases/redisConnection";

const instructionsPrompt =
  "Instructions: Respond in markdown format, with the following rules: - Use # for headers - Use * for bold - Use _ for italic - Use ~ for strikethrough - Use ` for code - Use ``` for code blocks - Use [text](url) for links - Use > for quotes - Use 1. 2. 3. for numbered lists - Use - for unnumbered lists. User: Explain the importance of fast language models";

export const sendPrompt = async (req: Request, res: Response) => {
  try {
    const { image, prompt, uuid } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Se requiere un prompt" });
    }
    const conversationHistory: any[] = (await redis_db.get(uuid)) || [];

    const instructionsObject = {
      role: "user",
      content: instructionsPrompt,
    };

    if (conversationHistory.length === 0) {
      conversationHistory.push(instructionsObject);
    }
    conversationHistory.push({ role: "user", content: prompt });

    let requestData = {
      model: "llama3.2",
      prompt: conversationHistory
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n"),
    };

    res.setHeader("Content-Type", "application/stream+json");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      requestData,
      { responseType: "stream" }
    );

    let fullResponse = "";

    response.data.on("data", (chunk: any) => {
      try {
        const data = JSON.parse(chunk.toString());

        if (data.done) {
          conversationHistory.push({
            role: "assistant",
            content: fullResponse,
          });
          res.write(
            `data: ${JSON.stringify({
              response: data.response,
              done: true,
            })}\n\n`
          );
          res.end();
        } else {
          fullResponse += data.response;
          res.write(
            `data: ${JSON.stringify({
              response: data.response,
              done: false,
            })}\n\n`
          );
        }
      } catch (parseError) {
        console.error("Error al parsear el chunk:", parseError);
        res.status(500).json({ error: "Error al procesar la respuesta" });
        return;
      }
    });

    response.data.on("error", (error: any) => {
      console.error("Error en la transmisión de datos:", error);
      res.status(500).json({ error: "Error en la transmisión de datos" });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const createTitle = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    const instructionsPrompt = {
      role: "user",
      content:
        "The answer must be in the prompt user language. Only respond with the title of the prompt. Need to be a single sentence, not a question. The sentence should be around 10 words and about the topic of the prompt.",
    };

    const conversationHistory: any[] = [];
    if (conversationHistory.length === 0) {
      conversationHistory.push(instructionsPrompt);
    }
    conversationHistory.push({ role: "user", content: prompt });

    let requestData = {
      model: "llama3.2",
      prompt: conversationHistory
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n"),
      stream: false,
    };

    const title = await axios.post(
      "http://localhost:11434/api/generate",
      requestData
    );

    console.log(title.data);

    res.status(200).json({ title: title.data.response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};