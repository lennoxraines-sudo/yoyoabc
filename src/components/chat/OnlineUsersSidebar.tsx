import { useState } from "react";
import { OnlineUser, AllUser } from "./types";
import { MessageSquare, Phone, Flag } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onlineUsers: OnlineUser[];
  allUsers: AllUser[];
  username: string;
  onUserClick: (username: string) => void;
  isAdmin?: boolean;
  onModerate?: (username: string) => void;
};

const OnlineUsersSidebar = ({ onlineUsers, allUsers, username, onUserClick, isAdmin, onModerate }: Props) => {
  const onlineUsernames = new Set(onlineUsers.map((u) => u.username));

  const sortedUsers = [...allUsers].sort((a, b) => {
    const aOnline = onlineUsernames.has(a.username);
    const bOnline = onlineUsernames.has(b.username);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.username.localeCompare(b.username);
  });

  const onlineCount = onlineUsers.length;

  return (
    <div className="relative z-10 w-56 flex-shrink-0 border-l-4 border-border bg-card flex flex-col">
      <div className="p-4 border-b-2 border-border/30">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Users — {allUsers.length} ({onlineCount} online)
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedUsers.map((user) => {
          const isOnline = onlineUsernames.has(user.username);
          const isSelf = user.username === username;
          const onlineInfo = onlineUsers.find((u) => u.username === user.username);

          return (
            <div
              key={user.username}
              className={`group flex items-center gap-2 w-full text-left p-2 rounded transition-colors ${
                !isSelf ? "hover:bg-muted/50" : ""
              }`}
            >
              {/* Status indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isOnline ? "bg-online" : "bg-destructive"
                }`}
              />

              {/* User info */}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-bold truncate ${
                    isSelf
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                >
                  {user.username}
                  {isSelf && " (you)"}
                </div>
                {isOnline && onlineInfo && (
                  <div className="text-xs text-muted-foreground truncate">
                    #{onlineInfo.channel}
                  </div>
                )}
                {!isOnline && (
                  <div className="text-xs text-muted-foreground">Offline</div>
                )}
              </div>

              {/* Action buttons - only for other users */}
              {!isSelf && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onUserClick(user.username)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    title="Send DM"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toast.info("Voice calls coming soon!")}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toast.info(`Reported ${user.username}`)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    title="Report"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnlineUsersSidebar;
