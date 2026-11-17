// Menandai akun ORGANIZER sebagai superadmin (boleh menyetujui pengajuan penyelenggara).
// Pakai: npx tsx --env-file=.env scripts/set-superadmin.ts email1 [email2 ...]   (tambah --off untuk mencabut)
import mongoose from "mongoose";
import { User, initModels } from "../src/models";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const on = !args.includes("--off");
  const emails = args.filter((arg) => arg !== "--off").map((email) => email.trim().toLowerCase());
  if (!emails.length) throw new Error("Sebutkan minimal satu email.");
  await mongoose.connect(process.env.MONGODB_URI!);
  await initModels();
  for (const email of emails) {
    const user = await User.findOneAndUpdate({ email, role: "ORGANIZER" }, { $set: { isSuperAdmin: on } }, { new: true, collation: { locale: "en", strength: 2 } }).lean<{ name: string } | null>();
    console.log(user ? `${on ? "superadmin" : "bukan superadmin"}: ${user.name} <${email}>` : `dilewati (bukan ORGANIZER atau tidak ada): ${email}`);
  }
  await mongoose.disconnect();
}

main().catch((error) => { console.error(error); process.exit(1); });
