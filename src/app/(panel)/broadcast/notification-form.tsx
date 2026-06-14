"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BroadcastResult, BroadcastTargetType } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TargetPicker, parseUserIds } from "@/components/target-picker";
import { Loader2, Send, Calculator } from "lucide-react";
import { toast } from "sonner";

export function BroadcastNotificationForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [screen, setScreen] = useState("");
  const [targetType, setTargetType] = useState<BroadcastTargetType>("ALL");
  const [segment, setSegment] = useState("");
  const [userIds, setUserIds] = useState("");
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const mutation = useMutation({
    mutationFn: (dryRun: boolean) =>
      api.post<BroadcastResult>("/admin/notifications/broadcast", {
        title,
        body,
        screen: screen || undefined,
        targetType,
        segment: targetType === "SEGMENT" ? segment : undefined,
        userIds: targetType === "USERS" ? parseUserIds(userIds) : undefined,
        dryRun,
      }),
    onSuccess: (res) => {
      setResult(res);
      if (res.dryRun) toast.success(`Simulação: ${res.total} destinatários.`);
      else
        toast.success(
          `Envio concluído: ${res.sent} enviados, ${res.failed} falhas.`,
        );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const valid =
    title.trim().length >= 2 &&
    body.trim().length >= 5 &&
    (targetType !== "SEGMENT" || !!segment) &&
    (targetType !== "USERS" || parseUserIds(userIds).length > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Push notification</CardTitle>
          <CardDescription>
            Enviada via FCM para os dispositivos dos usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Corpo</Label>
            <Textarea
              className="min-h-28"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tela (deep link opcional)</Label>
            <Input
              placeholder="ex.: learn, training"
              value={screen}
              onChange={(e) => setScreen(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <TargetPicker
          targetType={targetType}
          setTargetType={setTargetType}
          segment={segment}
          setSegment={setSegment}
          userIds={userIds}
          setUserIds={setUserIds}
        />

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate(true)}
          >
            {mutation.isPending && mutation.variables ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Calculator className="size-4" />
            )}
            Simular (contar)
          </Button>
          <Button
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate(false)}
          >
            {mutation.isPending && !mutation.variables ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Enviar agora
          </Button>
        </div>

        {result && (
          <Card>
            <CardContent className="space-y-1 py-4 text-sm">
              <p className="font-medium">
                {result.dryRun ? "Simulação" : "Resultado do envio"}
              </p>
              <p className="text-muted-foreground">
                Total: {result.total} · Enviados: {result.sent} · Falhas:{" "}
                {result.failed}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
