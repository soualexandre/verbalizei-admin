"use client";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Bell } from "lucide-react";
import { BroadcastEmailForm } from "./email-form";
import { BroadcastNotificationForm } from "./notification-form";

export default function BroadcastPage() {
  return (
    <>
      <PageHeader
        title="Broadcast"
        description="Envie e-mails e push notifications em massa. Use o modo simulação para contar destinatários antes de enviar."
      />

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="size-4" />
            E-mail
          </TabsTrigger>
          <TabsTrigger value="push">
            <Bell className="size-4" />
            Push
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <BroadcastEmailForm />
        </TabsContent>
        <TabsContent value="push">
          <BroadcastNotificationForm />
        </TabsContent>
      </Tabs>
    </>
  );
}
