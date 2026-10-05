import { Badge } from "@/components/ui/badge";
import type { UserPlan, UserRole } from "@/lib/types";

export function PlanBadge({ plan }: { plan: UserPlan }) {
  return (
    <Badge variant={plan === "PREMIUM" ? "default" : "secondary"}>{plan}</Badge>
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
      {active ? "Ativo" : "Inativo"}
    </Badge>
  );
}

export function MeetingsBetaBadge({ enabled }: { enabled: boolean }) {
  return enabled ? <Badge variant="outline">Beta reuniões</Badge> : null;
}
