/**
 * DI token under which the consumer-provided database client is registered. A `Symbol`
 * (not a string) so it can never collide with another provider token. Inject it with
 * {@link InjectDatabase} or `@Inject(DATABASE_CLIENT)`.
 */
export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');
