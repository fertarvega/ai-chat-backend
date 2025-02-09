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

    conversationHistory.push({ role: "user", content: prompt });

    let requestData = {
      model: "llama3.2",
      prompt: conversationHistory
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n"),
    };

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
          res.end();
        } else {
          fullResponse += data.response;
          res.write(chunk);
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
