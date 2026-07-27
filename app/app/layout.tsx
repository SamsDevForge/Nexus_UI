import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductShell } from "@/components/nexus/ProductShell";

export const metadata: Metadata = {
  title: {
    default: "NEXUS AI",
    template: "%s · NEXUS AI",
  },
  description:
    "The deterministic mocked NEXUS AI core product experience.",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="product-shell-loading" />}>
      <ProductShell>{children}</ProductShell>
    </Suspense>
  );
}
