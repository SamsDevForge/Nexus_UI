import type { Metadata } from "next";
import { CalendarExperience } from "@/components/nexus/CalendarExperience";

export const metadata: Metadata = { title: "Calendar", description: "Your schedule, its sources, and room to prepare." };
export default function CalendarPage() { return <CalendarExperience />; }
