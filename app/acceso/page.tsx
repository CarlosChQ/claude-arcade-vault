import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/app/components/auth-form";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};

export default function AccesoPage() {
  return (
    <div className="av-auth-wrap fade-in">
      {/* AuthForm lee ?modo con useSearchParams: con cacheComponents necesita Suspense. */}
      <Suspense fallback={<div className="auth-card min-h-[631px]" aria-hidden="true"></div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
