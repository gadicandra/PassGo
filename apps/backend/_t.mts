import mongoose from "mongoose";
await mongoose.connect(process.env.MONGODB_URI!);
console.log((await mongoose.connection.db!.collection("users").updateMany({ email: /^uji\.(organizer|attendee)\.1794884989231@example\.com$/ }, { $set: { isActive: process.argv[2] === "on" } })).modifiedCount);
await mongoose.disconnect();
