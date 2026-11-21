import type { Metadata } from "next";
import { NotificationsExperience } from "@/components/nexus/NotificationsExperience";

export const metadata: Metadata = { title: "Notifications", description: "Brief schedules, quiet hours and delivery history." };
export default function NotificationsPage() { return <NotificationsExperience />; }
