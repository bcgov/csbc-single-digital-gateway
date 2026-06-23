import { Inject } from '@nestjs/common';

import { DATABASE_CLIENT } from './database.constants';

/**
 * Injects the database client registered by {@link DatabaseModule}. Equivalent to
 * `@Inject(DATABASE_CLIENT)` — annotate the parameter with the consumer's own client type:
 *
 * ```ts
 * constructor(@InjectDatabase() private readonly db: Database) {}
 * ```
 */
export const InjectDatabase = (): ReturnType<typeof Inject> => Inject(DATABASE_CLIENT);
