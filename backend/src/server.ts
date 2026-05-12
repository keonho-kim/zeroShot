import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { apiRouter } from "./routes/api.js";
import { getWorkspaceRoot } from "./core/workspace.js";
import { loadAppConfig } from "./config/app-config.js";

const app = express();
const config = await loadAppConfig();
const port = Number(process.env.PORT ?? config.server.port);
const host = process.env.HOST ?? config.server.host;
const workspaceRoot = getWorkspaceRoot();
const frontendDist = process.env.ZEROSHOT_FRONTEND_DIST ?? join(workspaceRoot, "frontend", "dist");

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

app.listen(port, host, () => {
  console.log(`[zeroshot-backend] listening on http://${host}:${port}`);
  if (host === "0.0.0.0") {
    console.log(`[zeroshot-backend] local access: http://127.0.0.1:${port}`);
  }
});
