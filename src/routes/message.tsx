import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { Generator } from "@/components/Generator";

export const Route = createFileRoute("/message")({
  component: MessagePage,
  head: () => ({ meta: [{ title: "Write Message — Aassan Pak" }] }),
});

function MessagePage() {
  return (
    <div>
      <TopBar title="Write Message" subtitle="WhatsApp & SMS in clean English" icon={MessageCircle} />
      <Generator
        kind="message"
        cta="Write my message"
        toneLabel="Choose tone"
        toneKey="tone"
        tones={["Friendly", "Professional", "Respectful", "Casual"]}
        placeholder="Bhai mein 10 min late ho jaonga, traffic bohat hai…"
      />
    </div>
  );
}
