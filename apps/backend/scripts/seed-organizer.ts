import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../src/lib/database";
import { User, initModels } from "../src/models";

async function main(): Promise<void> {
  const email = (process.env.SEED_ORGANIZER_EMAIL ?? "organizer@passgo.local")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ORGANIZER_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("SEED_ORGANIZER_PASSWORD wajib diisi (minimal 8 karakter)");
  }
  await connectDatabase();
  await initModels();
  if (await User.findOne({ email })) {
    console.log(`Organizer ${email} sudah ada, dilewati.`);
    return;
  }
  await User.create({
    name: "Organizer PassGo",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "ORGANIZER",
    isActive: true,
    emailVerified: true,
    tokenVersion: 0,
    version: 1,
  });
  console.log(`Organizer ${email} dibuat.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
