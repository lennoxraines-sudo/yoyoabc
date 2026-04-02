import { OnlineUser } from "./types";

type Props = {
  onlineUsers: OnlineUser[];
  username: string;
  onUserClick: (username: string) => void;
};

const OnlineUsersSidebar = ({ onlineUsers, username, onUserClick }: Props) => {
  return (
    <div className="relative z-10 w-52 flex-shrink-0 border-l-4 border-border bg-card flex flex-col">
      <div className="p-4 border-b-2 border-border/30">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
          Online — {onlineUsers.length}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {onlineUsers.map((user) => (
          <button
            key={user.username}
            onClick={() => {
              if (user.username !== username) onUserClick(user.username);
            }}
            className={`flex items-start gap-2 w-full text-left ${
              user.username !== username
                ? "hover:bg-muted/50 cursor-pointer"
                : ""
            } p-1 transition-colors`}
          >
            <div className="w-2 h-2 rounded-full bg-online mt-1.5 flex-shrink-0" />
            <div className="min-w-0">
              <div
                className={`text-sm font-bold truncate ${
                  user.username === username
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {user.username}
              </div>
              <div className="text-xs text-muted-foreground">
                #{user.channel}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnlineUsersSidebar;
