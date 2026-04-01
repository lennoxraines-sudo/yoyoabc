import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  username: string;
  content: string;
  created_at: string;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const name = sessionStorage.getItem("chat-username");
    if (!name) {
      navigate("/");
      return;
    }
    setUsername(name);

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await supabase.from("messages").insert({
      username,
      content: input.trim(),
    });

    setInput("");
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem("chat-username");
    navigate("/");
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 grid-bg pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b-4 border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary border-2 border-border flex items-center justify-center">
            <div className="w-2 h-2 bg-primary animate-ping" />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-foreground text-glow">
            yoyo's network
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            [{username}]
          </span>
          <button
            onClick={handleDisconnect}
            className="text-xs uppercase tracking-widest text-destructive hover:text-destructive/80 font-bold transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 relative z-10 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.username === username ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] border-2 p-3 ${
                msg.username === username
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold uppercase ${
                  msg.username === username ? "text-primary" : "text-secondary"
                }`}>
                  {msg.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-foreground text-sm break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="relative z-10 border-t-4 border-border bg-card p-4 flex gap-3"
      >
        <input
          className="flex-1 text-base py-3 px-4 border-4 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          placeholder="TYPE YOUR MESSAGE..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          className="px-6 py-3 border-4 border-border bg-primary text-primary-foreground uppercase font-bold tracking-tight hover:bg-primary/90 transition-all hover:translate-y-0.5 cyber-glow"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
