import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { getHistoryBoard } from "./get-board.js";
import { getHistoryProjects } from "./get-projects.js";
import { getHistoryRecord } from "./get-record.js";
import { getRunDetail } from "./get-run-detail.js";
import { getRuns } from "./get-runs.js";

export const historyRouter: Router = express.Router();

historyRouter.get("/", asyncHandler(getRuns));
historyRouter.get("/projects", asyncHandler(getHistoryProjects));
historyRouter.get("/board", asyncHandler(getHistoryBoard));
historyRouter.get("/records/:recordId", asyncHandler(getHistoryRecord));
historyRouter.get("/:runName", asyncHandler(getRunDetail));
