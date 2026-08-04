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

/** A state / province / region under a country. `type` is the upstream subdivision type, if known.
 * `iso2` is the ISO 3166-2 subdivision code (e.g. `BC`), used to match address-search regions. */
export const geoStateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string().nullable(),
  iso2: z.string().nullable(),
});
export type GeoState = z.infer<typeof geoStateSchema>;
export class GeoStateListDto extends createZodDto(z.object({ items: z.array(geoStateSchema) })) {}

// ── Address search (feature 154) ─────────────────────────────────────────────────────────────────

/** A (country, province) ISO2 pair the server can run address search for. */
export const addressSearchRegionSchema = z.object({
  country: z.string(),
  province: z.string(),
});
export type AddressSearchRegion = z.infer<typeof addressSearchRegionSchema>;
export class AddressSearchRegionListDto extends createZodDto(
  z.object({ items: z.array(addressSearchRegionSchema) }),
) {}

/** A normalized address suggestion (no postal code — the BC geocoder returns none). */
export const addressSuggestionSchema = z.object({
  label: z.string(),
  streetAddress: z.string(),
  city: z.string(),
  provinceCode: z.string(),
});
export type AddressSuggestion = z.infer<typeof addressSuggestionSchema>;
export class AddressSuggestionListDto extends createZodDto(
  z.object({ items: z.array(addressSuggestionSchema) }),
) {}

/** `GET /v1/geo/address-search` query — ISO2 country + province + the typed text. */
export const addressSearchQuerySchema = z.object({
  country: z.string().trim().min(2).max(3),
  province: z.string().trim().min(1).max(3),
  q: z.string().trim().min(1).max(100),
});
export type AddressSearchQuery = z.infer<typeof addressSearchQuerySchema>;
export class AddressSearchQueryDto extends createZodDto(addressSearchQuerySchema) {}
