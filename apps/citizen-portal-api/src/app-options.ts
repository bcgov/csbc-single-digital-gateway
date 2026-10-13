import type { NestApplicationOptions } from '@nestjs/common';

/**
 * How citizen-portal-api is created. `forceCloseConnections` (123 B1): an open notification stream is a request that never ends,
 * and without it `app.close()` waits on it forever — a rebuilt dev process then hung in shutdown, never reaching the
 * database pool's `end()`, with its Postgres and Valkey sockets still open. Dropping the connections lets it exit;
 * the browser's EventSource reconnects to the new process.
 */
export const APP_OPTIONS: NestApplicationOptions = {
  bufferLogs: true,
  forceCloseConnections: true,
};
