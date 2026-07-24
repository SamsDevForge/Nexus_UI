import type { Metadata } from "next";
import { ProductShell } from "@/components/nexus/ProductShell";

export const metadata: Metadata = {
  title: "Today",
  description:
    "A mocked NEXUS AI Today experience for proactive student planning.",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProductShell>{children}</ProductShell>;
}
