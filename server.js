const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: "500mb" }));

let conversationHistory = [];

app.post("/chat", async (req, res) => {
  try {
    const { image, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Se requiere un prompt" });
    }

    conversationHistory.push({ role: "user", content: prompt });

    let requestData = {
      model: "llama3.2",
      prompt: conversationHistory
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n"),
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

app.get("/chat/reset", async (req, res) => {
  res.json({ conversationHistory });
  conversationHistory = [];
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
