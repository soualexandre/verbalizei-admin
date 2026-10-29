"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { initials } from "@/lib/utils";

/** Logo da empresa (só para ver; `decorative` quando o nome aparece ao lado): 32 px, rota pública da API; sem logo ou com erro de carga, mostra as iniciais. */
export function OrgLogo({ id, name, logoVersion, size = 32, decorative = false }: { id: string; name: string; logoVersion: string | null; size?: number; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  const box = "rounded-md border shrink-0 overflow-hidden";
  if (!logoVersion || failed) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={`${box} bg-muted text-muted-foreground inline-flex items-center justify-center text-xs font-semibold`}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo pública servida pela API, sem otimização do Next
    <img
      src={`${API_URL}/organizations/${id}/logo?v=${logoVersion}`}
      alt={decorative ? "" : `Logo de ${name}`}
      loading="lazy"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`${box} bg-white object-contain`}
    />
  );
}
