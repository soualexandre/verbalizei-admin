import type { OrgPersonResult, OrgRole } from "@/lib/types";

/** Papéis na empresa, como o portal chama. */
export const ROLE_LABEL: Record<OrgRole, string> = { OWNER: "Dono", MANAGER: "Gestor", MEMBER: "Atendente" };

/** O app de quem treina: o link de convite aponta para lá. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.verbalizei.com.br").replace(/\/$/, "");

export const inviteUrl = (code: string) => `${APP_URL}/entrar/${code}`;

/** O aviso depois de criar a empresa ou pôr alguém no time: o que saiu por e-mail. */
export function personToast(r: OrgPersonResult, who: string, role: OrgRole): string {
  const created = r.created ?? r.ownerCreated ?? false;
  const parts = [created ? `Conta criada para ${who}.` : `${who} já tinha conta.`];
  if (created) parts.push(r.passwordEmailSent ? "Enviamos o e-mail para definir a senha." : "O e-mail para definir a senha falhou: peça para usar \"Esqueci a senha\" ou o Google.");
  if (role !== "MEMBER") parts.push(r.welcomeSent ? "Enviamos as boas-vindas com o link do portal." : "O e-mail de boas-vindas falhou: mande o link do portal à mão.");
  return parts.join(" ");
}

/** "Válida até 31/12/2026", "Sem validade", "Venceu em …", "Pausada". */
export function validityText(o: { status: "ACTIVE" | "PAUSED"; active: boolean; activeUntil: string | null }): string {
  if (o.status === "PAUSED") return "Pausada";
  if (!o.activeUntil) return "Sem validade";
  const d = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(o.activeUntil));
  return o.active ? `Válida até ${d}` : `Venceu em ${d}`;
}

/** Data do <input type="date"> (yyyy-mm-dd) para ISO no fim do dia de Brasília; vazio = sem validade. */
export function dateInputToIso(v: string): string {
  return v ? `${v}T23:59:59-03:00` : "";
}

export function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
