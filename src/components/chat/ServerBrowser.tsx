import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Server } from "./types";

type Props = {
  userId: string;
  joinedServerIds: Set<string>;
  onClose: () => void;
  onJoined: () => void;
};

const ServerBrowser = ({ userId, joinedServerIds, onClose, onJoined }: Props) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("servers")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setServers(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleJoin = async (serverId: string) => {
    setJoining(serverId);
    try {
      const { error } = await supabase.from("server_members").insert({
        server_id: serverId,
        user_id: userId,
        role: "member",
      });
      if (error) throw error;
      toast.success("Joined server!");
      onJoined();
    } catch (err: any) {
      toast.error(err.message || "Failed to join");
    } finally {
      setJoining(null);
    }
  };

  const filtered = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[500px] max-h-[80vh] border-2 border-border bg-card flex flex-col shadow-lg">
        <div className="p-4 border-b-2 border-border/30 flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Browse Servers
          </div>
          <button
            onClick={onClose}
            className="text-xs uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>

        <div className="p-3 border-b border-border/30">
          <input
            className="w-full text-sm py-2 px-3 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="text-center text-muted-foreground text-sm py-8 animate-pulse uppercase tracking-widest">
              Loading...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No servers found
            </div>
          )}
          {filtered.map((server) => {
            const isJoined = joinedServerIds.has(server.id);
            return (
              <div
                key={server.id}
                className="flex items-center gap-3 p-3 border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl flex-shrink-0">
                  {server.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">
                    {server.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {server.description || "No description"}
                  </div>
                </div>
                {isJoined ? (
                  <span className="text-xs text-primary uppercase font-bold tracking-widest">
                    Joined
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoin(server.id)}
                    disabled={joining === server.id}
                    className="text-xs py-1.5 px-3 border border-primary bg-primary/10 text-primary uppercase font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {joining === server.id ? "..." : "Join"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ServerBrowser;
