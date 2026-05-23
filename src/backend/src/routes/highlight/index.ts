import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postHighlight } from "./post-highlight.js";

export const highlightRouter: Router = express.Router();

highlightRouter.post("/", asyncHandler(postHighlight));
