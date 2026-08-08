"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditorialLogRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#09090b", color: "#a1a1aa" }}>
      <span>Redirecting to Enterprise Dashboard...</span>
    </div>
  );
}
