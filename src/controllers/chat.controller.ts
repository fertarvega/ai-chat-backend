// src/controllers/chat.controller.ts

import axios from "axios";
import { Request, Response } from "express";
import redis_db from "../databases/redisConnection";

export const sendPrompt = async (req: Request, res: Response) => {
  try {
    const { image, prompt, uuid } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Se requiere un prompt" });
    }

    const conversationHistory: any[] = (await redis_db.get(uuid)) || [];

    const instructionsPrompt = {
      role: "instructions",
      content:
        "Respond in markdown format, with the following rules: - Use # for headers - Use * for bold - Use _ for italic - Use ~ for strikethrough - Use ` for code - Use ``` for code blocks - Use [text](url) for links - Use > for quotes - Use 1. 2. 3. for numbered lists - Use - for unnumbered lists.",
    };
    // const instructionsPrompt = {
    //   role: "instructions",
    //   content:
    //     "You are an expert on the financial area. Families, friends and normal people questions you about mortgage, insurance, credit cards, college, how to save money and how to invest. You will provide them answers to that questions, ALWAYS giving them a disclaimer that this is only informative and it is not an advice. Always answer in the language they talk with you.",
    // };

    if (conversationHistory.length === 0) {
      conversationHistory.push(instructionsPrompt);
    }

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
          redis_db.set(uuid, JSON.stringify(conversationHistory));
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

export const deleteChatDB = async (req: Request, res: Response) => {
  try {
    const { uuid } = req.query;

    if (!uuid) {
      return res.status(400).json({ message: "Bad request, needs uuid" });
    }

    await redis_db.del(uuid as string);
    res.status(200).json({ message: "Deleted on db" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
