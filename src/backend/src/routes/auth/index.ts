import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { getAuthStatus } from "./get-status.js";
import { putAuth } from "./put-auth.js";

export const authRouter: Router = express.Router();

authRouter.get("/status", asyncHandler(getAuthStatus));
authRouter.put("/", asyncHandler(putAuth));
