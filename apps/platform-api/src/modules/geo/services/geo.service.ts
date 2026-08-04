import { BadRequestException, Injectable } from '@nestjs/common';
import { type Database, countries, states } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { asc, eq } from 'drizzle-orm';

import { type GeoCountry, type GeoState } from '../dtos/geo.dtos';

/**
 * Read-only access to the `geo` reference data (feature 152) for the address form field (feature 153).
 * Public, workspace-free — just countries and their states/provinces. Nothing here writes.
 */
@Injectable()
export class GeoService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /**
   * Every country, alphabetical by name, with the two client flags the address control needs:
   * `hasStates` (does the country have any subdivisions in `geo.states`) and `hasPostal` (does it use
   * a postal code — a non-empty `postal_code_format`).
   */
  async listCountries(): Promise<GeoCountry[]> {
    const [rows, stateCountryRows] = await Promise.all([
      this.db
        .select({
          id: countries.id,
          name: countries.name,
          iso2: countries.iso2,
          postalFormat: countries.postalCodeFormat,
        })
        .from(countries)
        .orderBy(asc(countries.name)),
      this.db.selectDistinct({ countryId: states.countryId }).from(states),
    ]);
    const withStates = new Set(stateCountryRows.map((row) => row.countryId));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      iso2: row.iso2,
      hasStates: withStates.has(row.id),
      hasPostal: typeof row.postalFormat === 'string' && row.postalFormat.trim() !== '',
    }));
  }

  /**
   * The states / provinces of one country, alphabetical by name. `idParam` is the country integer id;
   * a non-integer is a 400 (never a Postgres 22P02 → 500). A country with no subdivisions returns `[]`
   * (not a 404).
   */
  async listStates(idParam: string): Promise<GeoState[]> {
    const countryId = Number(idParam);
    if (!Number.isInteger(countryId) || countryId <= 0) {
      throw new BadRequestException('country id must be a positive integer');
    }
    return this.db
      .select({ id: states.id, name: states.name, type: states.type, iso2: states.iso2 })
      .from(states)
      .where(eq(states.countryId, countryId))
      .orderBy(asc(states.name));
  }
}
