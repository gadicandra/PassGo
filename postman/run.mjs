// Newman membaca environment dari disk, sedangkan kredensial ada di apps/backend/.env
// (tidak di-commit). Script ini menyuntikkannya lewat --env-var saat run.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(new URL("../apps/backend/.env", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);

const overrides = {
  organizerEmail: env.SEED_ORGANIZER_EMAIL,
  organizerPassword: env.SEED_ORGANIZER_PASSWORD,
  attendeeEmail: env.SEED_ATTENDEE_EMAIL,
  attendeePassword: env.SEED_ATTENDEE_PASSWORD ?? env.SEED_ORGANIZER_PASSWORD,
  midtransServerKey: env.MIDTRANS_SERVER_KEY,
  origin: env.CSRF_ALLOWED_ORIGINS?.split(",")[0],
  baseUrl: `http://localhost:${env.PORT ?? 3000}/api/v1`,
};

const missing = ["organizerEmail", "organizerPassword"].filter((key) => !overrides[key]);
if (missing.length) {
  console.error(`apps/backend/.env belum berisi: ${missing.join(", ")}`);
  process.exit(1);
}

// --working-dir: src berkas upload di collection relatif terhadap postman/, bukan CWD.
const args = ["newman", "run", "postman/PassGo.postman_collection.json", "-e", "postman/PassGo.local.postman_environment.json", "--working-dir", "postman"];
for (const [key, value] of Object.entries(overrides)) {
  if (value) args.push("--env-var", `${key}=${value}`);
}
args.push(...process.argv.slice(2));

process.exit(spawnSync("npx", args, { stdio: "inherit", shell: true }).status ?? 1);
