import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postBuild } from "./post-build.js";

export const pipelineRouter: Router = express.Router();

pipelineRouter.post("/build", asyncHandler(postBuild));
