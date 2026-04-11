import { useState } from "react";
import { Channel, ChatView, OnlineUser, Server, ServerMember } from "./types";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  channels: Channel[];
  chatView: ChatView;
  onlineUsers: OnlineUser[];
  username: string;
  dmUsers: string[];
  onSelectChannel: (name: string) => void;
  onSelectDM: (username: string) => void;
  onExit: () => void;
  currentServer: Server | null;
  serverRole: "owner" | "moderator" | "member" | null;
  onChannelsChanged?: () => void;
};

const ChannelSidebar = ({
  channels,
  chatView,
  onlineUsers,
  username,
  dmUsers,
  onSelectChannel,
  onSelectDM,
  onExit,
  currentServer,
  serverRole,
  onChannelsChanged,
}: Props) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const canManageChannels = serverRole === "owner" || serverRole === "moderator";

  const channelOnlineCount = (channelName: string) =>
    onlineUsers.filter((u) => u.channel === channelName).length;

  const handleCreateChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || !currentServer) return;
    try {
      const { error } = await supabase.from("channels").insert({
        name,
        description: "",
        icon: "💬",
        server_id: currentServer.id,
        sort_order: channels.length,
      });
      if (error) throw error;
      toast.success(`#${name} created`);
      setNewChannelName("");
      setShowCreate(false);
      onChannelsChanged?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create channel");
    }
  };

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Delete #${channelName}?`)) return;
    try {
      const { error } = await supabase.from("channels").delete().eq("id", channelId);
      if (error) throw error;
      toast.success(`#${channelName} deleted`);
      onChannelsChanged?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete channel");
    }
  };

  const serverName = currentServer ? currentServer.name : "Global";

  return (
    <div className="relative z-10 w-52 flex-shrink-0 border-r-4 border-border bg-card flex flex-col">
      <div className="p-4 border-b-2 border-border/30">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          {currentServer ? "Server" : "Network"}
        </div>
        <div className="text-sm font-bold text-primary text-glow uppercase truncate">
          {currentServer ? `${currentServer.icon} ${serverName}` : "🌐 Global Chat"}
        </div>
        {serverRole && currentServer && (
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Role: {serverRole}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Channels
          </div>
          {canManageChannels && currentServer && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Add Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {showCreate && (
          <div className="mb-3 space-y-1">
            <input
              className="w-full text-xs py-1.5 px-2 border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              placeholder="channel-name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              maxLength={50}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
            />
            <button
              onClick={handleCreateChannel}
              className="w-full text-[10px] py-1 border border-primary bg-primary/10 text-primary uppercase font-bold hover:bg-primary/20 transition-colors"
            >
              Create
            </button>
          </div>
        )}

        <div className="space-y-1">
          {channels.map((ch) => {
            const count = channelOnlineCount(ch.name);
            const isActive =
              chatView.type === "channel" && chatView.name === ch.name;
            return (
              <div key={ch.id} className="group flex items-center">
                <button
                  onClick={() => onSelectChannel(ch.name)}
                  className={`flex-1 text-left px-3 py-2 flex items-center gap-2 transition-colors text-sm ${
                    isActive
                      ? "bg-primary/20 text-primary border-l-2 border-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="text-base">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{ch.name}</div>
                    {count > 0 && (
                      <div className="text-xs text-primary/70">
                        {count} online
                      </div>
                    )}
                  </div>
                </button>
                {canManageChannels && currentServer && (
                  <button
                    onClick={() => handleDeleteChannel(ch.id, ch.name)}
                    className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete channel"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* DMs section */}
        {dmUsers.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 mt-5 font-bold">
              Direct Messages
            </div>
            <div className="space-y-1">
              {dmUsers.map((user) => {
                const isActive =
                  chatView.type === "dm" && chatView.username === user;
                return (
                  <button
                    key={user}
                    onClick={() => onSelectDM(user)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors text-sm ${
                      isActive
                        ? "bg-secondary/20 text-secondary border-l-2 border-secondary"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-base">💬</span>
                    <div className="font-bold truncate">{user}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="p-3 border-t-2 border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-online animate-pulse" />
          <span className="text-sm font-bold text-foreground truncate max-w-[100px]">
            {username}
          </span>
        </div>
        <button
          onClick={onExit}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive font-bold transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
};

export default ChannelSidebar;
