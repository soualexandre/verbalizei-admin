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

export function BroadcastEmailForm() {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [highlight, setHighlight] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [targetType, setTargetType] = useState<BroadcastTargetType>("ALL");
  const [segment, setSegment] = useState("");
  const [userIds, setUserIds] = useState("");
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const mutation = useMutation({
    mutationFn: (dryRun: boolean) =>
      api.post<BroadcastResult>("/admin/emails/broadcast", {
        subject,
        title,
        content,
        highlight: highlight || undefined,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        targetType,
        segment: targetType === "SEGMENT" ? segment : undefined,
        userIds: targetType === "USERS" ? parseUserIds(userIds) : undefined,
        dryRun,
      }),
    onSuccess: (res) => {
      setResult(res);
      if (res.dryRun) {
        toast.success(`Simulação: ${res.total} destinatários.`);
      } else {
        toast.success(`Envio concluído: ${res.sent} enviados, ${res.failed} falhas.`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const valid =
    subject.trim().length >= 3 &&
    title.trim().length >= 3 &&
    content.trim().length >= 10 &&
    (targetType !== "SEGMENT" || !!segment) &&
    (targetType !== "USERS" || parseUserIds(userIds).length > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Conteúdo do e-mail</CardTitle>
          <CardDescription>
            Use {"{{firstName}}"} no corpo para personalizar com o primeiro nome.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Título (dentro do e-mail)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              className="min-h-40"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Destaque (callout opcional)</Label>
            <Input
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texto do botão (CTA)</Label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>URL do botão</Label>
              <Input
                type="url"
                placeholder="https://…"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </div>
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
