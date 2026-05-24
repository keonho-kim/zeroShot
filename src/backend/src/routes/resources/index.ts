import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { getResources } from "@backend/routes/resources/get-resources";

export const resourcesRouter: Router = express.Router();

resourcesRouter.get("/", asyncHandler(getResources));
