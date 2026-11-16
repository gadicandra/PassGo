import type { Metadata } from "next";
import { StaffAssignments } from "./StaffAssignments";

export const metadata: Metadata = { title: "Panitia acara" };

export default function EventStaffPage() {
  return <StaffAssignments />;
}
