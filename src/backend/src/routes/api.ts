import express, { type Router } from "express";
import { architectRouter } from "./architect/index.js";
import { authRouter } from "./auth/index.js";
import { designRouter } from "./design/index.js";
import { highlightRouter } from "./highlight/index.js";
import { historyRouter } from "./history/index.js";
import { jobsRouter } from "./jobs/index.js";
import { omakaseRouter } from "./omakase/index.js";
import { pipelineRouter } from "./pipeline/index.js";
import { projectsRouter } from "./projects/index.js";
import { resourcesRouter } from "./resources/index.js";
import { settingsRouter } from "./settings/index.js";
import { updateRouter } from "./update/index.js";

const router: Router = express.Router();

router.use("/auth", authRouter);
router.use("/projects", projectsRouter);
router.use("/architect", architectRouter);
router.use("/design", designRouter);
router.use(pipelineRouter);
router.use("/omakase", omakaseRouter);
router.use("/update", updateRouter);
router.use("/jobs", jobsRouter);
router.use("/history", historyRouter);
router.use("/highlight", highlightRouter);
router.use("/settings", settingsRouter);
router.use("/resources", resourcesRouter);

export { router as apiRouter };
