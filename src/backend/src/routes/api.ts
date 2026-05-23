import express, { type Router } from "express";
import { architectRouter } from "@backend/routes/architect";
import { authRouter } from "@backend/routes/auth";
import { designRouter } from "@backend/routes/design";
import { highlightRouter } from "@backend/routes/highlight";
import { historyRouter } from "@backend/routes/history";
import { jobsRouter } from "@backend/routes/jobs";
import { omakaseRouter } from "@backend/routes/omakase";
import { pipelineRouter } from "@backend/routes/pipeline";
import { projectsRouter } from "@backend/routes/projects";
import { resourcesRouter } from "@backend/routes/resources";
import { settingsRouter } from "@backend/routes/settings";
import { updateRouter } from "@backend/routes/update";

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
