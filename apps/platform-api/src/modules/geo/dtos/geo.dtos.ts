import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs for the public geo reference-data endpoints (feature 153). Read-only projections of
 * `geo.countries` / `geo.states` (feature 152) — just the fields the address form field needs.
 * Response DTOs serialize handler output via @ZodSerializerDto.
 */

/**
 * A country option for the address field's country combobox. `iso2` drives the per-country label
 * lookup; `hasStates` tells the client to show a states dropdown vs a free-text province input;
 * `hasPostal` hides the postal field for countries with no postal system.
 */
export const geoCountrySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  iso2: z.string().nullable(),
  hasStates: z.boolean(),
  hasPostal: z.boolean(),
});
export type GeoCountry = z.infer<typeof geoCountrySchema>;
export class GeoCountryListDto extends createZodDto(
  z.object({ items: z.array(geoCountrySchema) }),
) {}

/** A state / province / region under a country. `type` is the upstream subdivision type, if known. */
export const geoStateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string().nullable(),
});
export type GeoState = z.infer<typeof geoStateSchema>;
export class GeoStateListDto extends createZodDto(z.object({ items: z.array(geoStateSchema) })) {}
