-- Bootstrap: extensions + functions that the generated table migration depends on.
-- Must run BEFORE 0001 (tables) because `users.email` is citext and `workspaces.slug`
-- defaults to nanoid(). Statements are separated by drizzle's statement-breakpoint marker.

CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
-- nanoid helper: secure random id generation (pgcrypto gen_random_bytes).
CREATE OR REPLACE FUNCTION nanoid_optimized(size int, alphabet text, mask int, step int)
    RETURNS text
    LANGUAGE plpgsql
    VOLATILE PARALLEL SAFE
    AS $$
DECLARE
    idBuilder text := '';
    counter int := 0;
    bytes bytea;
    alphabetIndex int;
    alphabetArray text[];
    alphabetLength int;
BEGIN
    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);
    LOOP
        bytes := gen_random_bytes(step);
        FOR counter IN 0..step - 1 LOOP
            alphabetIndex :=(get_byte(bytes, counter) & mask) + 1;
            IF alphabetIndex <= alphabetLength THEN
                idBuilder := idBuilder || alphabetArray[alphabetIndex];
                IF length(idBuilder) = size THEN
                    RETURN idBuilder;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION nanoid(
    size int DEFAULT 21,
    alphabet text DEFAULT '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    additionalBytesFactor float DEFAULT 1.02
)
    RETURNS text
    LANGUAGE plpgsql
    VOLATILE PARALLEL SAFE
    AS $$
DECLARE
    alphabetLength int;
    mask int;
    step int;
BEGIN
    IF size IS NULL OR size < 1 THEN
        RAISE EXCEPTION 'The size must be defined and greater than 0!';
    END IF;
    IF alphabet IS NULL OR length(alphabet) < 2 OR length(alphabet) > 255 THEN
        RAISE EXCEPTION 'The alphabet must be between 2 and 255 symbols!';
    END IF;
    IF additionalBytesFactor IS NULL OR additionalBytesFactor < 1 THEN
        RAISE EXCEPTION 'The additional bytes factor can''t be less than 1!';
    END IF;

    alphabetLength := length(alphabet);
    mask := (2 << cast(floor(log(alphabetLength - 1) / log(2)) AS int)) - 1;
    step := cast(ceil(additionalBytesFactor * mask * size / alphabetLength) AS int);

    IF step > 1024 THEN
        step := 1024;
    END IF;

    RETURN nanoid_optimized(size, alphabet, mask, step);
END
$$;
--> statement-breakpoint
-- Trigger function: stamps updated_at on every UPDATE. Attached per-table in 0002.
CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END
$$;
