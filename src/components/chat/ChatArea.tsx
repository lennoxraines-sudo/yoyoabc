import { useRef, useEffect } from "react";
import { Message, DirectMessage, ChatView, Channel, OnlineUser } from "./types";

type Props = {
  chatView: ChatView;
  messages: Message[];
  directMessages: DirectMessage[];
  currentChannel?: Channel;
  username: string;
  input: string;
  onlineUsers: OnlineUser[];
  onInputChange: (val: string) => void;
  onSend: (e: React.FormEvent) => void;
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const ChatArea = ({
  chatView,
  messages,
  directMessages,
  currentChannel,
  username,
  input,
  onlineUsers,
  onInputChange,
  onSend,
}: Props) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayMessages =
    chatView.type === "channel"
      ? messages.map((m) => ({
          id: m.id,
          author: m.username,
          content: m.content,
          created_at: m.created_at,
        }))
      : directMessages.map((m) => ({
          id: m.id,
          author: m.sender_username,
          content: m.content,
          created_at: m.created_at,
        }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  const channelOnlineCount =
    chatView.type === "channel"
      ? onlineUsers.filter((u) => u.channel === chatView.name).length
      : 0;

  const headerTitle =
    chatView.type === "channel" ? chatView.name : `DM: ${chatView.username}`;
  const headerIcon =
    chatView.type === "channel" ? currentChannel?.icon || "💬" : "🔒";
  const headerDesc =
    chatView.type === "channel"
      ? currentChannel?.description || ""
      : `Private conversation with ${chatView.username}`;
  const placeholder =
    chatView.type === "channel"
      ? `Transmit to #${chatView.name}...`
      : `Message ${chatView.username}...`;

  return (
    <div className="flex-1 flex flex-col relative z-10 min-w-0">
      {/* Header */}
      <div className="border-b-4 border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{headerIcon}</span>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-primary text-glow">
              {headerTitle}
            </h1>
            <p className="text-xs text-muted-foreground">{headerDesc}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-online">
            <span className="w-2 h-2 rounded-full bg-online animate-pulse" />
            Live
          </span>
          {chatView.type === "channel" && (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span>💬</span>
              {channelOnlineCount} in channel
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start">
            <div className="max-w-[80%]">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold uppercase ${
                    msg.author === username ? "text-primary" : "text-secondary"
                  }`}
                >
                  {msg.author}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <div className="border-2 border-border bg-card p-3">
                <p className="text-foreground text-sm break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={onSend}
        className="border-t-4 border-border bg-card p-3 flex items-center gap-3"
      >
        <button
          type="button"
          className="w-10 h-10 border-2 border-border bg-muted/50 flex items-center justify-center text-lg hover:bg-muted transition-colors"
        >
          😀
        </button>
        <button
          type="button"
          className="w-10 h-10 border-2 border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          📎
        </button>
        <input
          className="flex-1 text-sm py-3 px-4 border-2 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          className="px-6 py-3 border-2 border-border bg-primary text-primary-foreground uppercase font-bold tracking-tight hover:bg-primary/90 transition-all text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatArea;
