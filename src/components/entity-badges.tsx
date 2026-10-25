import { Badge } from "@/components/ui/badge";
import type { UserPlan, UserRole } from "@/lib/types";

export function PlanBadge({ plan }: { plan: UserPlan }) {
  return (
    <Badge variant={plan === "FREE" ? "secondary" : "default"}>{plan}</Badge>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "ADMIN" ? "warning" : "outline"}>{role}</Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "destructive"}>
      {/* Status com bolinha, como nas tabelas da referência (25/10/2026). */}
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {active ? "Ativo" : "Inativo"}
    </Badge>
  );
}

export function MeetingsBetaBadge({ enabled }: { enabled: boolean }) {
  return enabled ? <Badge variant="outline">Beta reuniões</Badge> : null;
}
