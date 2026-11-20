import type { Metadata } from "next";
import { CommutePlanner } from "@/components/nexus/CommutePlanner";

export const metadata: Metadata = { title: "Commute planner", description: "Plan a journey using public forecasts and explicit travel estimates." };
export default function ContextPage() { return <CommutePlanner />; }
