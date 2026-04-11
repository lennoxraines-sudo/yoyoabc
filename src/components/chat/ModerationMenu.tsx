import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GripHorizontal } from "lucide-react";

type Props = {
  targetUsername: string;
  onClose: () => void;
  moderate: (action: string, opts: any) => Promise<any>;
};

const SILENCE_DURATIONS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "1 hour", value: 60 },
  { label: "24 hours", value: 1440 },
];

const ModerationMenu = ({ targetUsername, onClose, moderate }: Props) => {
  const [reason, setReason] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Initialize position on first drag if not set
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    } else {
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
    setDragging(true);
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  useEffect(() => {
    const fetchEmail = async () => {
      // Look up user_id from profiles, then get email via edge function
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", targetUsername)
        .single();

      if (profile) {
        // Use the moderate edge function to get email
        try {
          const { data, error } = await supabase.functions.invoke("moderate", {
            body: { action: "get_email", target_username: targetUsername },
          });
          if (data?.email) setEmail(data.email);
        } catch {
          // silently fail
        }
      }
    };
    fetchEmail();
  }, [targetUsername]);

  const handleAction = async (action: string, opts: any = {}) => {
    setLoading(true);
    try {
      const result = await moderate(action, {
        target_username: targetUsername,
        reason,
        ...opts,
      });
      toast.success(result.message || "Action completed");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={panelRef}
      className={`${position ? "fixed" : "absolute right-0 top-full mt-1"} z-50 w-72 border-2 border-border bg-card p-3 space-y-3 shadow-lg`}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing py-1 -mt-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripHorizontal className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-widest">Drag to move</span>
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold border-b border-border pb-2">
        Moderate: {targetUsername}
      </div>

      {/* Email display */}
      <div className="text-xs text-muted-foreground border border-border/50 bg-muted/30 px-2 py-1.5 rounded">
        <span className="font-bold uppercase tracking-wider">Email: </span>
        <span className="text-foreground">{email || "Loading..."}</span>
      </div>

      <input
        className="w-full text-xs py-2 px-2 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
      />

      <button
        disabled={loading}
        onClick={() => handleAction("ban")}
        className="w-full text-xs py-2 px-3 border border-destructive bg-destructive/10 text-destructive uppercase font-bold tracking-tight hover:bg-destructive/20 transition-colors disabled:opacity-50"
      >
        🚫 Ban User
      </button>

      <div className="space-y-1">
        <input
          className="w-full text-xs py-2 px-2 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          placeholder="IP Address"
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
        />
        <button
          disabled={loading || !ipAddress.trim()}
          onClick={() => handleAction("ip_ban", { ip_address: ipAddress.trim() })}
          className="w-full text-xs py-2 px-3 border border-destructive bg-destructive/10 text-destructive uppercase font-bold tracking-tight hover:bg-destructive/20 transition-colors disabled:opacity-50"
        >
          🌐 IP Ban
        </button>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-bold uppercase">Silence Duration</div>
        <div className="grid grid-cols-2 gap-1">
          {SILENCE_DURATIONS.map((d) => (
            <button
              key={d.value}
              disabled={loading}
              onClick={() => handleAction("silence", { duration_minutes: d.value })}
              className="text-xs py-2 px-2 border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 uppercase font-bold hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
            >
              🔇 {d.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full text-xs py-1 text-muted-foreground hover:text-foreground transition-colors uppercase"
      >
        Cancel
      </button>
    </div>
  );
};

export default ModerationMenu;
