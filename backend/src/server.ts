import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { apiRouter } from "./routes/api.js";
import { getWorkspaceRoot } from "./core/workspace.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const workspaceRoot = getWorkspaceRoot();
const frontendDist = join(workspaceRoot, "frontend", "dist");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api", apiRouter);

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(join(frontendDist, "index.html"));
  });
}

app.use((error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  res.status(error.statusCode ?? 500).json({
    message: error.message
  });
});

app.listen(port, () => {
  console.log(`[zeroshot-backend] listening on http://localhost:${port}`);
});
