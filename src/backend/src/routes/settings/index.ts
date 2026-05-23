import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { getAppSettings } from "./get-app.js";
import { getCodexSettings } from "./get-codex.js";
import { getProjectCodexSettings } from "./get-project-codex.js";
import { postProjectCodexSettings } from "./post-project-codex.js";
import { putAppSettings } from "./put-app.js";
import { putCodexSettings } from "./put-codex.js";

export const settingsRouter: Router = express.Router();

settingsRouter.get("/codex", asyncHandler(getCodexSettings));
settingsRouter.put("/codex", asyncHandler(putCodexSettings));
settingsRouter.get("/codex/project", asyncHandler(getProjectCodexSettings));
settingsRouter.post("/codex/project", asyncHandler(postProjectCodexSettings));
settingsRouter.get("/app", asyncHandler(getAppSettings));
settingsRouter.put("/app", asyncHandler(putAppSettings));
