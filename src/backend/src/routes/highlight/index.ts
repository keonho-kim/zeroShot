import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { postHighlight } from "@backend/routes/highlight/post-highlight";

export const highlightRouter: Router = express.Router();

highlightRouter.post("/", asyncHandler(postHighlight));
