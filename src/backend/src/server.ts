import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { apiRouter } from "@backend/routes/api.js";
import { getWorkspaceRoot } from "@backend/core/workspace.js";
import { loadAppConfig } from "@backend/config/app-config.js";
import { captureServerError, initServerObservability } from "@backend/observability/sentry.js";
import { ensureResourceStoreSeeded } from "@backend/services/resource-seed-service.js";

const app = express();
initServerObservability();
const config = await loadAppConfig();
await ensureResourceStoreSeeded(config);
const port = Number(process.env.PORT ?? config.server.port);
const host = process.env.HOST ?? config.server.host;
const workspaceRoot = getWorkspaceRoot();
const frontendDist = process.env.ZEROSHOT_FRONTEND_DIST ?? join(workspaceRoot, "src", "ui", "dist");

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
  captureServerError(error);
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
