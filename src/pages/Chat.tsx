import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  username: string;
  content: string;
  channel: string;
  created_at: string;
};

type Channel = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState("chilling");
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<{ username: string; channel: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const name = sessionStorage.getItem("chat-username");
    if (!name) {
      navigate("/");
      return;
    }
    setUsername(name);

    // Fetch channels
    supabase
      .from("channels")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setChannels(data);
      });
  }, [navigate]);

  // Presence tracking
  useEffect(() => {
    if (!username) return;

    const presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: username } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users: { username: string; channel: string }[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            users.push({
              username: key,
              channel: (presences[0] as { channel?: string }).channel || "chilling",
            });
          }
        });
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ channel: activeChannel });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [username]);

  // Update presence when channel changes
  useEffect(() => {
    if (!username) return;
    const presenceChannel = supabase.channel("online-users");
    presenceChannel.track({ channel: activeChannel });
  }, [activeChannel, username]);

  // Fetch messages for active channel
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", activeChannel)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${activeChannel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${activeChannel}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await supabase.from("messages").insert({
      username,
      content: input.trim(),
      channel: activeChannel,
    });

    setInput("");
  };

  const handleExit = () => {
    sessionStorage.removeItem("chat-username");
    navigate("/");
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

  const channelOnlineCount = (channelName: string) =>
    onlineUsers.filter((u) => u.channel === channelName).length;

  const currentChannel = channels.find((c) => c.name === activeChannel);

  return (
    <div className="h-[100dvh] w-full flex bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 grid-bg pointer-events-none" />

      {/* Left Sidebar */}
      <div className="relative z-10 w-52 flex-shrink-0 border-r-4 border-border bg-card flex flex-col">
        {/* Network Title */}
        <div className="p-4 border-b-2 border-border/30">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Network
          </div>
          <div className="text-sm font-bold text-primary text-glow uppercase">
            yoyo's network chat
          </div>
        </div>

        {/* Servers */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">
            Servers
          </div>
          <div className="space-y-1">
            {channels.map((ch) => {
              const count = channelOnlineCount(ch.name);
              const isActive = ch.name === activeChannel;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.name)}
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
        </div>

        {/* User Footer */}
        <div className="p-3 border-t-2 border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-bold text-foreground truncate max-w-[100px]">
              {username}
            </span>
          </div>
          <button
            onClick={handleExit}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive font-bold transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Channel Header */}
        <div className="border-b-4 border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {currentChannel?.icon || "💬"}
            </span>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight text-primary text-glow">
                {activeChannel}
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentChannel?.description || ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span>💬</span>
              {channelOnlineCount(activeChannel)} in channel
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col items-start">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold uppercase ${
                      msg.username === username
                        ? "text-primary"
                        : "text-secondary"
                    }`}
                  >
                    {msg.username}
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

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
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
            placeholder={`Transmit to #${activeChannel}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
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

      {/* Right Sidebar - Online Users */}
      <div className="relative z-10 w-52 flex-shrink-0 border-l-4 border-border bg-card flex flex-col">
        <div className="p-4 border-b-2 border-border/30">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Online — {onlineUsers.length}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {onlineUsers.map((user) => (
            <div key={user.username} className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chat;
