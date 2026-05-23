import express, { type Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postArchitectBootstrap } from "./post-bootstrap.js";
import { postArchitectDecisions } from "./post-decisions.js";
import { postArchitectDecisionsStream } from "./post-decisions-stream.js";
import { postArchitectProductHtml } from "./post-product-html.js";
import { postArchitectProductHtmlStream } from "./post-product-html-stream.js";

export const architectRouter: Router = express.Router();

architectRouter.post("/decisions", asyncHandler(postArchitectDecisions));
architectRouter.post("/decisions/stream", asyncHandler(postArchitectDecisionsStream));
architectRouter.post("/bootstrap", asyncHandler(postArchitectBootstrap));
architectRouter.post("/product-html", asyncHandler(postArchitectProductHtml));
architectRouter.post("/product-html/stream", asyncHandler(postArchitectProductHtmlStream));
