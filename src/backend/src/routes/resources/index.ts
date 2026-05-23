import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { getResources } from "./get-resources.js";

export const resourcesRouter: Router = express.Router();

resourcesRouter.get("/", asyncHandler(getResources));
