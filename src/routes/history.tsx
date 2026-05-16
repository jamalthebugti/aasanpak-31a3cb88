import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Mail, MessageCircle, Reply as ReplyIcon, Copy, Trash2 } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — Aassan Pak" }] }),
});

type Row = {
  id: string; kind: "email" | "message" | "reply";
  input: string; output: string; created_at: string;
};

const iconFor = { email: Mail, message: MessageCircle, reply: ReplyIcon } as const;
const labelFor = { email: "Email", message: "Message", reply: "Reply" } as const;

function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("history")
      .select("id,kind,input,output,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("history").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div>
      <TopBar title="History" subtitle="Your previous generations" icon={Clock} />
      <div className="px-5 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <div className="card-soft p-8 text-center">
            <Clock className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-3 font-semibold">No history yet</p>
            <p className="text-sm text-muted-foreground">Your generated emails and messages will appear here.</p>
          </div>
        )}
        {rows.map((r) => {
          const Icon = iconFor[r.kind];
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="card-soft overflow-hidden">
              <button
                className="w-full p-4 flex items-center gap-3 text-left"
                onClick={() => setOpen(isOpen ? null : r.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{labelFor[r.kind]} · {new Date(r.created_at).toLocaleDateString()}</p>
                  <p className="font-medium truncate">{r.input}</p>
                </div>
              </button>
              <div className={cn("grid transition-all", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{r.output}</pre>
                    <div className="flex gap-2">
                      <button onClick={() => copy(r.output)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm">
                        <Copy className="w-4 h-4" /> Copy
                      </button>
                      <button onClick={() => remove(r.id)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
