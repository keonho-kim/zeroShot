import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { getAppSettings } from "@backend/routes/settings/get-app";
import { getCodexSettings } from "@backend/routes/settings/get-codex";
import { getProjectCodexSettings } from "@backend/routes/settings/get-project-codex";
import { postProjectCodexSettings } from "@backend/routes/settings/post-project-codex";
import { putAppSettings } from "@backend/routes/settings/put-app";
import { putCodexSettings } from "@backend/routes/settings/put-codex";

export const settingsRouter: Router = express.Router();

settingsRouter.get("/codex", asyncHandler(getCodexSettings));
settingsRouter.put("/codex", asyncHandler(putCodexSettings));
settingsRouter.get("/codex/project", asyncHandler(getProjectCodexSettings));
settingsRouter.post("/codex/project", asyncHandler(postProjectCodexSettings));
settingsRouter.get("/app", asyncHandler(getAppSettings));
settingsRouter.put("/app", asyncHandler(putAppSettings));
