import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { getCurrentJob } from "@backend/routes/jobs/get-current";
import { getJobStream } from "@backend/routes/jobs/get-stream";

export const jobsRouter: Router = express.Router();

jobsRouter.get("/current", asyncHandler(getCurrentJob));
jobsRouter.get("/:jobId/stream", asyncHandler(getJobStream));
