import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { getHistoryBoard } from "@backend/routes/history/get-board";
import { getHistoryProjects } from "@backend/routes/history/get-projects";
import { getHistoryRecord } from "@backend/routes/history/get-record";
import { getRunDetail } from "@backend/routes/history/get-run-detail";
import { getRuns } from "@backend/routes/history/get-runs";

export const historyRouter: Router = express.Router();

historyRouter.get("/", asyncHandler(getRuns));
historyRouter.get("/projects", asyncHandler(getHistoryProjects));
historyRouter.get("/board", asyncHandler(getHistoryBoard));
historyRouter.get("/records/:recordId", asyncHandler(getHistoryRecord));
historyRouter.get("/:runName", asyncHandler(getRunDetail));
