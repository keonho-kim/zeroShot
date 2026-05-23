import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { getCurrentJob } from "./get-current.js";
import { getJobStream } from "./get-stream.js";

export const jobsRouter: Router = express.Router();

jobsRouter.get("/current", asyncHandler(getCurrentJob));
jobsRouter.get("/:jobId/stream", asyncHandler(getJobStream));
