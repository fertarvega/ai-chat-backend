import express from "express";
import cors from "cors";
import axios from "axios";
import { Redis } from "@upstash/redis";
import { config } from "dotenv";

const app = express();
const port = 3000;
config();

app.use(cors());
app.use(express.json({ limit: "500mb" }));

const redis = new Redis({
  url: process.env.URL_REDIS,
  token: process.env.TOKEN_REDIS,
});

app.post("/chat", async (req, res) => {
  try {
    const { image, prompt, uuid } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Se requiere un prompt" });
    }
    const conversationHistory = (await redis.get(uuid)) || [];

    conversationHistory.push({ role: "user", content: prompt });
    let requestData = {
      model: "llama3.2",
      prompt: conversationHistory
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n"),
      // stream: false,
    };
    // if (image) {
    //   requestData.images = [image.split(",")[1]];
    // }
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      requestData,
      { responseType: "stream" }
    );

    let fullResponse = "";
    response.data.on("data", (chunk) => {
      const data = JSON.parse(chunk.toString());
      if (data.done) {
        conversationHistory.push({ role: "assistant", content: fullResponse });
        redis.set(uuid, conversationHistory);
        res.end();
      } else {
        fullResponse += data.response;
        res.write(chunk);
      }
    });

    response.data.on("error", (error) => {
      console.error("Error en la transmisión de datos:", error);
      res.status(500).json({ error: "Error en la transmisión de datos" });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/chat/delete", async (req, res) => {
  try {
    const { uuid } = req.query;
    redis.del(uuid);
    res.status(200).json({ message: "Deleted on db" });
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
