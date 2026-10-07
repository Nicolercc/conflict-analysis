import crypto from "node:crypto";
import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createBriefState } from "./lib/brief-state";
import { AppError, invalidInput, sendError } from "./lib/errors";

const app: Express = express();

app.disable("x-powered-by");
// One proxy hop (the hosting platform's load balancer) sets X-Forwarded-For.
app.set("trust proxy", 1);

app.locals.briefs = createBriefState();

app.use(
	pinoHttp({
		logger,
		genReqId: (_req, res) => {
			const id = crypto.randomUUID();
			res.setHeader("X-Request-Id", id);
			return id;
		},
		serializers: {
			req(req) {
				return {
					id: req.id,
					method: req.method,
					url: req.url?.split("?")[0],
				};
			},
			res(res) {
				return {
					statusCode: res.statusCode,
				};
			},
		},
	}),
);

// Browsers on other origins may not call the API. This does not stop direct
// requests — rate limits and the generation budget do that.
const allowedOrigins = (
	process.env["CORS_ORIGINS"] ??
	"https://conflict-analysis-vantage.vercel.app,http://localhost:5173"
)
	.split(",")
	.map((o) => o.trim())
	.filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: "64kb" }));

// Health check endpoint for deploy platforms
app.get("/api/healthz", (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

// Malformed or oversized bodies and anything a route did not handle itself.
const onError: ErrorRequestHandler = (err, req, res, _next) => {
	const status = (err as { status?: number })?.status;
	if (status === 413) {
		return sendError(req, res, new AppError(413, "INVALID_INPUT", "That request is too large."));
	}
	if (status === 400) {
		return sendError(req, res, invalidInput("The request body is not valid JSON."));
	}
	sendError(req, res, err);
};
app.use(onError);

export default app;
