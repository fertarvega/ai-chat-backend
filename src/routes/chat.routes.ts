import { Response, Request, Router } from "express";
import { createTitle, getGroqChatCompletion, deleteChatDB } from "../controllers/chat.controller";

const router = Router();

router.post("/generate", (req: Request, res: Response) => {
  getGroqChatCompletion(req, res);
});

router.post("/title", (req: Request, res: Response) => {
  createTitle(req, res);
});

router.delete("/delete", (req: Request, res: Response) => {
  deleteChatDB(req, res);
});

export default router;
