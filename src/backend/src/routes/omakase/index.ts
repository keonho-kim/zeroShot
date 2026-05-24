import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { postOmakaseStream } from "@backend/routes/omakase/post-stream";

export const omakaseRouter: Router = express.Router();

omakaseRouter.post("/stream", asyncHandler(postOmakaseStream));
