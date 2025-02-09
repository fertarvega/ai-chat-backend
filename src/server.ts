import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.routes";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: "500mb" }));

app.use("/chat/", chatRouter);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
