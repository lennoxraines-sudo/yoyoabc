import { Channel, ChatView, OnlineUser } from "./types";

type Props = {
  channels: Channel[];
  chatView: ChatView;
  onlineUsers: OnlineUser[];
  username: string;
  dmUsers: string[];
  onSelectChannel: (name: string) => void;
  onSelectDM: (username: string) => void;
  onExit: () => void;
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
}: Props) => {
  const channelOnlineCount = (channelName: string) =>
    onlineUsers.filter((u) => u.channel === channelName).length;

  return (
    <div className="relative z-10 w-52 flex-shrink-0 border-r-4 border-border bg-card flex flex-col">
      <div className="p-4 border-b-2 border-border/30">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Network
        </div>
        <div className="text-sm font-bold text-primary text-glow uppercase">
          yoyo's network chat
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">
          Servers
        </div>
        <div className="space-y-1">
          {channels.map((ch) => {
            const count = channelOnlineCount(ch.name);
            const isActive =
              chatView.type === "channel" && chatView.name === ch.name;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.name)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors text-sm ${
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
