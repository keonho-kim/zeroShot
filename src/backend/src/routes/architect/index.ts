import express, { type Router } from "express";
import { asyncHandler } from "@backend/routes/shared/async-handler";
import { postArchitectBootstrap } from "@backend/routes/architect/post-bootstrap";
import { postArchitectDecisions } from "@backend/routes/architect/post-decisions";
import { postArchitectDecisionsStream } from "@backend/routes/architect/post-decisions-stream";
import { postArchitectProductHtml } from "@backend/routes/architect/post-product-html";
import { postArchitectProductHtmlStream } from "@backend/routes/architect/post-product-html-stream";

export const architectRouter: Router = express.Router();

architectRouter.post("/decisions", asyncHandler(postArchitectDecisions));
architectRouter.post("/decisions/stream", asyncHandler(postArchitectDecisionsStream));
architectRouter.post("/bootstrap", asyncHandler(postArchitectBootstrap));
architectRouter.post("/product-html", asyncHandler(postArchitectProductHtml));
architectRouter.post("/product-html/stream", asyncHandler(postArchitectProductHtmlStream));
