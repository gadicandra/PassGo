import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../src/lib/database";
import { User, initModels } from "../src/models";

async function seedUser(name: string, rawEmail: string, password: string, role: "ORGANIZER" | "ATTENDEE"): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (await User.findOne({ email })) {
    console.log(`${role} ${email} sudah ada, dilewati.`);
    return;
  }
  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    isActive: true,
    // Akun seed dibuat langsung terverifikasi: job email-outbox belum ada (M2),
    // sehingga token verifikasi tidak pernah sampai ke inbox mana pun.
    emailVerified: true,
    tokenVersion: 0,
    version: 1,
  });
  console.log(`${role} ${email} dibuat.`);
}

async function main(): Promise<void> {
  const password = process.env.SEED_ORGANIZER_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("SEED_ORGANIZER_PASSWORD wajib diisi (minimal 8 karakter)");
  }
  await connectDatabase();
  await initModels();
  await seedUser("Organizer PassGo", process.env.SEED_ORGANIZER_EMAIL ?? "organizer@passgo.local", password, "ORGANIZER");
  await seedUser("Peserta PassGo", process.env.SEED_ATTENDEE_EMAIL ?? "peserta@passgo.local", process.env.SEED_ATTENDEE_PASSWORD ?? password, "ATTENDEE");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
