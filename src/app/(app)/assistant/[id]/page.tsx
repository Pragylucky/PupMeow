import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssistantView } from "../assistant-view";

export const metadata: Metadata = { title: "Kaia, your AI pet helper", robots: { index: false } };

export default async function AssistantChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <AssistantView conversationId={id} />;
}
