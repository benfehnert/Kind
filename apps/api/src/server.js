import dotenv from "dotenv";

// dotenv.config() must run before worker.js and its deps evaluate,
// since they may read process.env at module init time.
dotenv.config();

const { default: app } = await import("./worker.js");
const { serve } = await import("@hono/node-server");

const port = Number(process.env.PORT || 4000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API running on http://localhost:${info.port}`);
});
