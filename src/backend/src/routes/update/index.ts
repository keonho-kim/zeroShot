import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { postUpdateDecisionsStream } from "@backend/routes/update/post-decisions-stream";
import { postUpdate } from "@backend/routes/update/post-update";

export const updateRouter: Router = express.Router();

updateRouter.post("/decisions/stream", asyncHandler(postUpdateDecisionsStream));
updateRouter.post("/", asyncHandler(postUpdate));
