import 'dotenv/config';
import { loadConfig } from "./lib/config";
import { logger } from "./lib/logger";

// Check the whole configuration before anything else is loaded, and say
// everything that is wrong at once.
const { problems, warnings } = loadConfig();
for (const warning of warnings) logger.warn(`configuration: ${warning}`);
if (problems.length > 0) {
  for (const problem of problems) logger.error(`configuration: ${problem}`);
  logger.error(`Refusing to start: ${problems.length} configuration problem(s).`);
  process.exit(1);
}

const { default: app } = await import("./app");

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

const shutdown = () => {
  server.close(() => {
    logger.info("Server closed cleanly");
    process.exit(0);
  });
  // An in-flight generation must not hold the process open indefinitely.
  setTimeout(() => {
    logger.warn("Forcing exit after shutdown grace period");
    process.exit(1);
  }, 15_000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
