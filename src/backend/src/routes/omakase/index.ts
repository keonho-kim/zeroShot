import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postOmakaseStream } from "./post-stream.js";

export const omakaseRouter: Router = express.Router();

omakaseRouter.post("/stream", asyncHandler(postOmakaseStream));
