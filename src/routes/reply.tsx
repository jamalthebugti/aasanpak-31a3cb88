import { createFileRoute } from "@tanstack/react-router";
import { Reply as ReplyIcon } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { Generator } from "@/components/Generator";

export const Route = createFileRoute("/reply")({
  component: ReplyPage,
  head: () => ({ meta: [{ title: "Smart Reply — Aassan Pak" }] }),
});

function ReplyPage() {
  return (
    <div>
      <TopBar title="Smart Reply" subtitle="Paste message — get a smart reply" icon={ReplyIcon} />
      <Generator
        kind="reply"
        cta="Generate reply"
        toneLabel="Reply style"
        toneKey="style"
        tones={["Short", "Professional", "Friendly", "Formal"]}
        placeholder="Paste the email or WhatsApp message you received here…"
      />
    </div>
  );
}
