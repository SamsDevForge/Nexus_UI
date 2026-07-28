import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ProductShell } from "@/components/nexus/ProductShell";
import { AuthGate } from "@/components/nexus/AuthGate";

export const metadata: Metadata = {
  title: {
    default: "NEXUS AI",
    template: "%s · NEXUS AI",
  },
  description:
    "The deterministic mocked NEXUS AI core product experience.",
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialFocusMode =
    cookieStore.get("nexus-focus-mode")?.value === "on";

  return (
    <Suspense fallback={<div className="product-shell-loading" />}>
      <AuthGate>
        <ProductShell initialFocusMode={initialFocusMode}>
          {children}
        </ProductShell>
      </AuthGate>
    </Suspense>
  );
}
