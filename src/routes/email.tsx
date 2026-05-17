import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { Generator } from "@/components/Generator";

export const Route = createFileRoute("/email")({
  component: EmailPage,
  head: () => ({ meta: [{ title: "Write Email — Aassan Pak" }] }),
});

function EmailPage() {
  return (
    <div>
      <TopBar title="Write Email" subtitle="Professional English, easy input" icon={Mail} />
      <Generator
        kind="email"
        cta="Write my email"
        tones={["Professional", "Friendly", "Formal", "Casual"]}
        lengths={["Standard", "Detailed Professional", "Highly Professional", "Short Version"]}
        placeholder="Boss ko email likhna hai k kal chutti chahiye family emergency ki wajah se…"
      />
    </div>
  );
}
