// Shared types for Cloudflare Workers environment

export type CloudflareEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

export type CloudflareContext = {
  env: CloudflareEnv;
  ctx: ExecutionContext;
};
