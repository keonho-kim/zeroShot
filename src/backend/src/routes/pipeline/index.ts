import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { postBuild } from "@backend/routes/pipeline/post-build";

export const pipelineRouter: Router = express.Router();

pipelineRouter.post("/build", asyncHandler(postBuild));
