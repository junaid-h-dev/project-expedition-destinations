import { config } from "dotenv";

// The CLI scripts load `.env` themselves (the Next.js server does it for us).
// `quiet` suppresses dotenv's own banner so the output of a script — the token
// `api:token` prints, above all — is only what the script meant to say.
config({ quiet: true });
