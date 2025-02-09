import { Response, Request, Router } from "express";
import { deleteChatDB, sendPrompt } from "../controllers/chat.controller";

const router = Router();

router.post("/generate", (req: Request, res: Response) => {
  sendPrompt(req, res);
});
router.get("/delete", (req: Request, res: Response) => {    
  deleteChatDB(req, res);
});

export default router;
