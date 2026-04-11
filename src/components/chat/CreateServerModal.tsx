import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ICONS = ["🖥️", "🎮", "🎵", "📚", "🎨", "🏠", "⚡", "🔥", "💎", "🌟", "🎯", "🏆"];

type Props = {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
};

const CreateServerModal = ({ userId, onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🖥️");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("servers").insert({
        name: trimmedName,
        description: description.trim(),
        icon,
        owner_id: userId,
      });
      if (error) throw error;
      toast.success(`Server "${trimmedName}" created!`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-96 border-2 border-border bg-card p-6 space-y-4 shadow-lg">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold border-b border-border pb-2">
          Create Server
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold block mb-1">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-9 h-9 flex items-center justify-center text-lg rounded transition-all ${
                    icon === i
                      ? "bg-primary/20 border border-primary"
                      : "bg-muted/50 border border-border/50 hover:border-primary/50"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold block mb-1">
              Server Name
            </label>
            <input
              className="w-full text-sm py-2 px-3 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              placeholder="My Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold block mb-1">
              Description
            </label>
            <input
              className="w-full text-sm py-2 px-3 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              placeholder="What's this server about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 text-xs py-2 px-3 border border-primary bg-primary/10 text-primary uppercase font-bold tracking-tight hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Server"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs py-2 px-3 text-muted-foreground hover:text-foreground transition-colors uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServerModal;
