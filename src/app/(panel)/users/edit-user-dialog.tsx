"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminUser, UserPlan, UserRole } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState<UserPlan>("FREE");
  const [role, setRole] = useState<UserRole>("USER");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (user) {
      setPlan(user.plan);
      setRole(user.role);
      setIsActive(user.isActive);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/admin/users/${user!.id}`, { plan, role, isActive }),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as UserPlan)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="PREMIUM">PREMIUM (1 ano)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Conceder PREMIUM define expiração de 1 ano automaticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="active-switch">Conta ativa</Label>
              <p className="text-muted-foreground text-xs">
                Desativar impede o login do usuário.
              </p>
            </div>
            <Switch
              id="active-switch"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
