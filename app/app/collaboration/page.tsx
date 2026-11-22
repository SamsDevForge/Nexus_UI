import type { Metadata } from "next";
import { CollaborationExperience } from "@/components/nexus/CollaborationExperience";

export const metadata: Metadata = { title: "Sources & notes", description: "Selected Notion and Teams evidence with approved note drafts." };
export default function CollaborationPage() { return <CollaborationExperience />; }
