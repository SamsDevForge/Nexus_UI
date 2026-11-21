import type { Metadata } from "next";
import { MailExperience } from "@/components/nexus/MailExperience";

export const metadata: Metadata = { title: "Mail review", description: "Source-linked email suggestions and corrections." };
export default function MailPage() { return <MailExperience />; }
