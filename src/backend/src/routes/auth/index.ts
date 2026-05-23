import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { getAuthStatus } from "@backend/routes/auth/get-status";
import { putAuth } from "@backend/routes/auth/put-auth";

export const authRouter: Router = express.Router();

authRouter.get("/status", asyncHandler(getAuthStatus));
authRouter.put("/", asyncHandler(putAuth));
