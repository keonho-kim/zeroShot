import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { getLatestDesign } from "@backend/routes/design/get-latest";
import { postDesignRecommendationsStream } from "@backend/routes/design/post-recommendations-stream";
import { postDesignRuntimeStream } from "@backend/routes/design/post-runtime-stream";

export const designRouter: Router = express.Router();

designRouter.get("/latest", asyncHandler(getLatestDesign));
designRouter.post("/recommendations/stream", asyncHandler(postDesignRecommendationsStream));
designRouter.post("/runtime/stream", asyncHandler(postDesignRuntimeStream));
