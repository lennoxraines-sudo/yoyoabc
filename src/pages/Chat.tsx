import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Message, DirectMessage, Channel, OnlineUser, ChatView } from "@/components/chat/types";
import { useModeration } from "@/hooks/useModeration";
import ChannelSidebar from "@/components/chat/ChannelSidebar";
import OnlineUsersSidebar from "@/components/chat/OnlineUsersSidebar";
import ChatArea from "@/components/chat/ChatArea";

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [chatView, setChatView] = useState<ChatView>({ type: "channel", name: "chilling" });
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [dmUsers, setDmUsers] = useState<string[]>([]);
  const navigate = useNavigate();
  const { isAdmin, isBanned, isSilenced, silencedUntil, moderate } = useModeration(userId);

  // Auth check + load profile
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();

      if (profile) setUsername(profile.username);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/");
    });

    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!username) return;

    supabase
      .from("channels")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setChannels(data);
      });
  }, [username]);

  // Presence tracking
  useEffect(() => {
    if (!username) return;

    const presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: username } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users: OnlineUser[] = [];
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
          const channelName = chatView.type === "channel" ? chatView.name : "DM";
          await presenceChannel.track({ channel: channelName });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Update presence when view changes
  useEffect(() => {
    if (!username) return;
    const presenceChannel = supabase.channel("online-users");
    const channelName = chatView.type === "channel" ? chatView.name : "DM";
    presenceChannel.track({ channel: channelName });
  }, [chatView, username]);

  // Fetch channel messages
  useEffect(() => {
    if (chatView.type !== "channel") return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", chatView.name)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${chatView.name}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${chatView.name}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatView]);

  // Fetch DMs
  useEffect(() => {
    if (chatView.type !== "dm" || !username) return;

    const otherUser = chatView.username;

    const fetchDMs = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_username.eq.${username},receiver_username.eq.${otherUser}),and(sender_username.eq.${otherUser},receiver_username.eq.${username})`
        )
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setDirectMessages(data);
    };
    fetchDMs();

    const channel = supabase
      .channel(`dm-${[username, otherUser].sort().join("-")}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const dm = payload.new as DirectMessage;
          if (
            (dm.sender_username === username && dm.receiver_username === otherUser) ||
            (dm.sender_username === otherUser && dm.receiver_username === username)
          ) {
            setDirectMessages((prev) => [...prev, dm]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatView, username]);

  // Load DM user list
  useEffect(() => {
    if (!username) return;

    const fetchDmUsers = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("sender_username, receiver_username")
        .or(`sender_username.eq.${username},receiver_username.eq.${username}`);

      if (data) {
        const users = new Set<string>();
        data.forEach((dm) => {
          if (dm.sender_username !== username) users.add(dm.sender_username);
          if (dm.receiver_username !== username) users.add(dm.receiver_username);
        });
        setDmUsers(Array.from(users));
      }
    };
    fetchDmUsers();
  }, [username, chatView]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !userId) return;

      if (chatView.type === "channel") {
        await supabase.from("messages").insert({
          username,
          content: input.trim(),
          channel: chatView.name,
          user_id: userId,
        });
      } else {
        await supabase.from("direct_messages").insert({
          sender_username: username,
          receiver_username: chatView.username,
          content: input.trim(),
          user_id: userId,
        });
      }

      setInput("");
    },
    [input, chatView, username, userId]
  );

  const handleExit = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSelectChannel = (name: string) => {
    setChatView({ type: "channel", name });
  };

  const handleSelectDM = (user: string) => {
    if (!dmUsers.includes(user)) {
      setDmUsers((prev) => [...prev, user]);
    }
    setChatView({ type: "dm", username: user });
  };

  const currentChannel = channels.find(
    (c) => chatView.type === "channel" && c.name === chatView.name
  );

  if (!username) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
        <div className="text-primary text-glow uppercase tracking-widest animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 grid-bg pointer-events-none" />

      <ChannelSidebar
        channels={channels}
        chatView={chatView}
        onlineUsers={onlineUsers}
        username={username}
        dmUsers={dmUsers}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
        onExit={handleExit}
      />

      <ChatArea
        chatView={chatView}
        messages={messages}
        directMessages={directMessages}
        currentChannel={currentChannel}
        username={username}
        input={input}
        onlineUsers={onlineUsers}
        onInputChange={setInput}
        onSend={handleSend}
        isAdmin={isAdmin}
        isBanned={isBanned}
        isSilenced={isSilenced}
        silencedUntil={silencedUntil}
        moderate={moderate}
      />

      <OnlineUsersSidebar
        onlineUsers={onlineUsers}
        username={username}
        onUserClick={handleSelectDM}
      />
    </div>
  );
};

export default Chat;
