import type { Metadata } from "next";
import { AssistantView } from "./assistant-view";

export const metadata: Metadata = { title: "Kaia, your AI pet helper", robots: { index: false } };

export default async function AssistantPage() {
  return <AssistantView conversationId={null} />;
}
