"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { api } from "@/lib/api";
import type { Challenge } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ChallengeImageDialog({
  challenge,
  open,
  onOpenChange,
  onChanged,
}: {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const imageUrl = preview ?? challenge?.imageUrl ?? null;

  const upload = useMutation({
    mutationFn: (file: File) =>
      api.upload<{ imageUrl: string }>(
        `/admin/challenges/${challenge!.id}/upload-image`,
        file,
      ),
    onSuccess: (res) => {
      setPreview(res.imageUrl);
      toast.success("Imagem enviada.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/challenges/${challenge!.id}/image`),
    onSuccess: () => {
      setPreview(null);
      toast.success("Imagem removida.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const refresh = useMutation({
    mutationFn: () =>
      api.post<{ imageUrl: string }>(
        `/admin/challenges/${challenge!.id}/refresh-image-url`,
      ),
    onSuccess: (res) => {
      setPreview(res.imageUrl);
      toast.success("URL atualizada.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const busy = upload.isPending || remove.isPending || refresh.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setPreview(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imagem do desafio</DialogTitle>
          <DialogDescription>
            Envie, atualize ou remova a imagem (JPEG/PNG, máx. 5MB).
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden rounded-md">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={640}
              height={360}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <span className="text-muted-foreground text-sm">Sem imagem</span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Enviar imagem
          </Button>
          {challenge?.imageUrl && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => refresh.mutate()}
              >
                <RefreshCw className="size-4" />
                Regerar URL
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => remove.mutate()}
              >
                <Trash2 className="size-4" />
                Remover
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
