CREATE SCHEMA "geo";
--> statement-breakpoint
CREATE TABLE "geo"."regions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"wiki_data_id" text,
	"translations" jsonb
);
--> statement-breakpoint
CREATE TABLE "geo"."subregions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region_id" integer NOT NULL,
	"wiki_data_id" text,
	"translations" jsonb
);
--> statement-breakpoint
CREATE TABLE "geo"."countries" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"iso3" text,
	"iso2" text,
	"numeric_code" text,
	"phonecode" text,
	"capital" text,
	"currency" text,
	"currency_name" text,
	"currency_symbol" text,
	"tld" text,
	"native" text,
	"nationality" text,
	"population" bigint,
	"gdp" bigint,
	"area_sq_km" numeric,
	"postal_code_format" text,
	"postal_code_regex" text,
	"region" text,
	"region_id" integer,
	"subregion" text,
	"subregion_id" integer,
	"timezones" jsonb,
	"translations" jsonb,
	"latitude" numeric(11, 8),
	"longitude" numeric(11, 8),
	"emoji" text,
	"emoji_u" text,
	"wiki_data_id" text
);
--> statement-breakpoint
CREATE TABLE "geo"."states" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_id" integer NOT NULL,
	"country_code" text,
	"iso2" text,
	"iso3166_2" text,
	"fips_code" text,
	"type" text,
	"parent_id" integer,
	"native" text,
	"timezone" text,
	"latitude" numeric(11, 8),
	"longitude" numeric(11, 8),
	"wiki_data_id" text
);
--> statement-breakpoint
CREATE TABLE "geo"."cities" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state_id" integer NOT NULL,
	"state_code" text,
	"country_id" integer NOT NULL,
	"country_code" text,
	"latitude" numeric(11, 8),
	"longitude" numeric(11, 8),
	"wiki_data_id" text
);
--> statement-breakpoint
ALTER TABLE "geo"."subregions" ADD CONSTRAINT "subregions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "geo"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo"."countries" ADD CONSTRAINT "countries_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "geo"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo"."countries" ADD CONSTRAINT "countries_subregion_id_subregions_id_fk" FOREIGN KEY ("subregion_id") REFERENCES "geo"."subregions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo"."states" ADD CONSTRAINT "states_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "geo"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo"."cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "geo"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo"."cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "geo"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "geo_subregions_region_id_idx" ON "geo"."subregions" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "geo_countries_region_id_idx" ON "geo"."countries" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "geo_countries_subregion_id_idx" ON "geo"."countries" USING btree ("subregion_id");--> statement-breakpoint
CREATE INDEX "geo_states_country_id_idx" ON "geo"."states" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "geo_cities_country_id_idx" ON "geo"."cities" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "geo_cities_state_id_idx" ON "geo"."cities" USING btree ("state_id");