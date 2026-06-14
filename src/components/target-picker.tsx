"use client";

import type { BroadcastTargetType } from "@/lib/types";
import { USER_SEGMENTS } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TargetPicker({
  targetType,
  setTargetType,
  segment,
  setSegment,
  userIds,
  setUserIds,
}: {
  targetType: BroadcastTargetType;
  setTargetType: (t: BroadcastTargetType) => void;
  segment: string;
  setSegment: (s: string) => void;
  userIds: string;
  setUserIds: (s: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label>Destinatários</Label>
        <Select
          value={targetType}
          onValueChange={(v) => setTargetType(v as BroadcastTargetType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos (não-mock)</SelectItem>
            <SelectItem value="SEGMENT">Por segmento</SelectItem>
            <SelectItem value="USERS">IDs específicos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {targetType === "SEGMENT" && (
        <div className="space-y-2">
          <Label>Segmento</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {USER_SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {targetType === "USERS" && (
        <div className="space-y-2">
          <Label>IDs de usuários</Label>
          <Textarea
            placeholder="Um ID por linha ou separados por vírgula"
            value={userIds}
            onChange={(e) => setUserIds(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export function parseUserIds(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
