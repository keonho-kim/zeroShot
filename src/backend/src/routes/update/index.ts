import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postUpdateDecisionsStream } from "./post-decisions-stream.js";
import { postUpdate } from "./post-update.js";

export const updateRouter: Router = express.Router();

updateRouter.post("/decisions/stream", asyncHandler(postUpdateDecisionsStream));
updateRouter.post("/", asyncHandler(postUpdate));
