import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Loader2 } from "lucide-react";
import { type Session } from "@/core/utils/storage";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessions: Session[];
  onAssign: (email: string) => void;
  loading: boolean;
}

export function AssignClientDialog({ open, onOpenChange, sessions, onAssign, loading }: Props) {
  const [email, setEmail] = useState("");

  const knownEmails = Array.from(
    new Set(sessions.map((s) => s.clientEmail).filter(Boolean))
  ) as string[];

  function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    onAssign(trimmed);
  }

  function handleOpenChange(v: boolean) {
    if (!v) setEmail("");
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>שייך פגישה ללקוח</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <label htmlFor="assign-email" className="text-xs font-medium text-muted-foreground block">
            אימייל הלקוח
          </label>
          <Input
            id="assign-email"
            type="email"
            list="assign-known-emails"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {knownEmails.length > 0 && (
            <datalist id="assign-known-emails">
              {knownEmails.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          )}
          {knownEmails.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              לקוחות קיימים: {knownEmails.slice(0, 4).join(", ")}
              {knownEmails.length > 4 ? "…" : ""}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!email.trim() || loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            שייך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
