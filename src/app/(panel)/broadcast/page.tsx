"use client";

import { PageHero } from "@/components/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Bell } from "lucide-react";
import { BroadcastEmailForm } from "./email-form";
import { BroadcastNotificationForm } from "./notification-form";

/**
 * Broadcast: a faixa só tem título, descrição e a escolha do canal. A tela
 * não busca nenhum número (a contagem de destinatários sai da simulação de
 * cada formulário), então não há totalizadores nem insights.
 */
export default function BroadcastPage() {
  return (
    <Tabs defaultValue="email" className="space-y-6">
      <PageHero
        title="Broadcast"
        description="Envie e-mails e notificações push para muita gente de uma vez. Use o modo simulação para contar os destinatários antes de enviar."
        actions={
          <TabsList aria-label="Canal">
            <TabsTrigger value="email">
              <Mail className="size-4" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="push">
              <Bell className="size-4" />
              Push
            </TabsTrigger>
          </TabsList>
        }
      />
      <TabsContent value="email">
        <BroadcastEmailForm />
      </TabsContent>
      <TabsContent value="push">
        <BroadcastNotificationForm />
      </TabsContent>
    </Tabs>
  );
}
