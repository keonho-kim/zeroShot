import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { getLatestDesign } from "./get-latest.js";
import { postDesignRecommendationsStream } from "./post-recommendations-stream.js";
import { postDesignRuntimeStream } from "./post-runtime-stream.js";

export const designRouter: Router = express.Router();

designRouter.get("/latest", asyncHandler(getLatestDesign));
designRouter.post("/recommendations/stream", asyncHandler(postDesignRecommendationsStream));
designRouter.post("/runtime/stream", asyncHandler(postDesignRuntimeStream));
