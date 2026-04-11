import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Message, DirectMessage, Channel, OnlineUser, AllUser, ChatView, Server, ServerMember } from "@/components/chat/types";
import { useModeration } from "@/hooks/useModeration";
import ServerListSidebar from "@/components/chat/ServerListSidebar";
import ChannelSidebar from "@/components/chat/ChannelSidebar";
import OnlineUsersSidebar from "@/components/chat/OnlineUsersSidebar";
import ChatArea from "@/components/chat/ChatArea";
import CreateServerModal from "@/components/chat/CreateServerModal";
import ServerBrowser from "@/components/chat/ServerBrowser";

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
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const navigate = useNavigate();
  const { isAdmin, isBanned, isSilenced, silencedUntil, moderate } = useModeration(userId);

  // Server state
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [joinedServers, setJoinedServers] = useState<Server[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showBrowseServers, setShowBrowseServers] = useState(false);

  // Auth check + load profile
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles").select("username").eq("id", session.user.id).single();
      if (profile) setUsername(profile.username);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/");
    });
    init();
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load joined servers
  const fetchJoinedServers = useCallback(async () => {
    if (!userId) return;
    const { data: members } = await supabase
      .from("server_members").select("server_id, role").eq("user_id", userId);
    if (!members || members.length === 0) { setJoinedServers([]); setServerMembers([]); return; }

    const serverIds = members.map((m) => m.server_id);
    const { data: servers } = await supabase
      .from("servers").select("*").in("id", serverIds);
    if (servers) setJoinedServers(servers);
    setServerMembers(members as unknown as ServerMember[]);
  }, [userId]);

  useEffect(() => { fetchJoinedServers(); }, [fetchJoinedServers]);

  // Load channels for current server
  const fetchChannels = useCallback(async () => {
    if (!username) return;
    if (currentServerId) {
      const { data } = await supabase
        .from("channels").select("*").eq("server_id", currentServerId).order("sort_order");
      if (data) {
        setChannels(data);
        if (data.length > 0 && chatView.type === "channel") {
          const exists = data.some((c) => c.name === chatView.name);
          if (!exists) setChatView({ type: "channel", name: data[0].name });
        }
      }
    } else {
      const { data } = await supabase
        .from("channels").select("*").is("server_id", null).order("sort_order");
      if (data) setChannels(data);
    }
  }, [username, currentServerId]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Load all users
  useEffect(() => {
    if (!username) return;
    supabase.from("profiles").select("id, username").then(({ data }) => {
      if (data) setAllUsers(data.map((p) => ({ id: p.id, username: p.username })));
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
    return () => { supabase.removeChannel(presenceChannel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
      let query = supabase
        .from("messages").select("*").eq("channel", chatView.name)
        .order("created_at", { ascending: true }).limit(500);
      if (currentServerId) {
        query = query.eq("server_id", currentServerId);
      } else {
        query = query.is("server_id", null);
      }
      const { data } = await query;
      if (data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase
      .channel(`messages-${currentServerId || "global"}-${chatView.name}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `channel=eq.${chatView.name}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if ((msg.server_id || null) === (currentServerId || null)) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatView, currentServerId]);

  // Fetch DMs
  useEffect(() => {
    if (chatView.type !== "dm" || !username) return;
    const otherUser = chatView.username;
    const fetchDMs = async () => {
      const { data } = await supabase
        .from("direct_messages").select("*")
        .or(`and(sender_username.eq.${username},receiver_username.eq.${otherUser}),and(sender_username.eq.${otherUser},receiver_username.eq.${username})`)
        .order("created_at", { ascending: true }).limit(100);
      if (data) setDirectMessages(data);
    };
    fetchDMs();
    const interval = setInterval(fetchDMs, 3000);
    return () => { clearInterval(interval); };
  }, [chatView, username]);

  // Load DM user list
  useEffect(() => {
    if (!username) return;
    const fetchDmUsers = async () => {
      const { data } = await supabase
        .from("direct_messages").select("sender_username, receiver_username")
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

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !userId || isBanned || isSilenced) return;
    if (trimmed.length > 2000) { toast.error("Message is too long"); return; }
    try {
      if (chatView.type === "channel") {
        const optimisticMessage: Message = {
          id: crypto.randomUUID(), username, content: trimmed,
          channel: chatView.name, created_at: new Date().toISOString(),
          server_id: currentServerId,
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        const insertData: any = { username, content: trimmed, channel: chatView.name, user_id: userId };
        if (currentServerId) insertData.server_id = currentServerId;
        const { error } = await supabase.from("messages").insert(insertData);
        if (error) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
          throw error;
        }
      } else {
        const optimisticMessage: DirectMessage = {
          id: crypto.randomUUID(), sender_username: username,
          receiver_username: chatView.username, content: trimmed,
          created_at: new Date().toISOString(),
        };
        setDirectMessages((prev) => [...prev, optimisticMessage]);
        const { error } = await supabase.from("direct_messages").insert({
          sender_username: username, receiver_username: chatView.username,
          content: trimmed, user_id: userId,
        });
        if (error) {
          setDirectMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
          throw error;
        }
      }
      setInput("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  }, [input, chatView, username, userId, isBanned, isSilenced, currentServerId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    // Allow global admins or server owners/mods
    const canDelete = isAdmin || currentServerRole === "owner" || currentServerRole === "moderator";
    if (!canDelete) return;
    if (chatView.type === "channel") {
      await supabase.from("messages").delete().eq("id", messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } else {
      await supabase.from("direct_messages").delete().eq("id", messageId);
      setDirectMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }, [isAdmin, chatView]);

  const handleExit = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSelectChannel = (name: string) => {
    setChatView({ type: "channel", name });
  };

  const handleSelectDM = (user: string) => {
    if (!dmUsers.includes(user)) setDmUsers((prev) => [...prev, user]);
    setChatView({ type: "dm", username: user });
  };

  const handleSelectServer = (serverId: string | null) => {
    setCurrentServerId(serverId);
    // Reset to first channel when switching servers
    setChatView({ type: "channel", name: "" }); // will be corrected by fetchChannels effect
  };

  const currentChannel = channels.find(
    (c) => chatView.type === "channel" && c.name === chatView.name
  );

  const currentServer = currentServerId
    ? joinedServers.find((s) => s.id === currentServerId) || null
    : null;

  const currentServerRole = currentServerId
    ? (serverMembers.find((m) => m.server_id === currentServerId)?.role || null)
    : null;

  const canModerate = isAdmin || currentServerRole === "owner" || currentServerRole === "moderator";

  const joinedServerIds = new Set(joinedServers.map((s) => s.id));

  if (!username) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
        <div className="text-primary text-glow uppercase tracking-widest animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 grid-bg pointer-events-none" />

      <ServerListSidebar
        servers={joinedServers}
        currentServerId={currentServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={() => setShowCreateServer(true)}
        onBrowseServers={() => setShowBrowseServers(true)}
      />

      <ChannelSidebar
        channels={channels}
        chatView={chatView}
        onlineUsers={onlineUsers}
        username={username}
        dmUsers={dmUsers}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
        onExit={handleExit}
        currentServer={currentServer}
        serverRole={currentServerRole}
        onChannelsChanged={fetchChannels}
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
        onDeleteMessage={handleDeleteMessage}
        isAdmin={canModerate}
        isBanned={isBanned}
        isSilenced={isSilenced}
        silencedUntil={silencedUntil}
        moderate={moderate}
      />

      <OnlineUsersSidebar
        onlineUsers={onlineUsers}
        allUsers={allUsers}
        username={username}
        onUserClick={handleSelectDM}
        isAdmin={canModerate}
        moderate={moderate}
      />

      {showCreateServer && userId && (
        <CreateServerModal
          userId={userId}
          onClose={() => setShowCreateServer(false)}
          onCreated={fetchJoinedServers}
        />
      )}

      {showBrowseServers && userId && (
        <ServerBrowser
          userId={userId}
          joinedServerIds={joinedServerIds}
          onClose={() => setShowBrowseServers(false)}
          onJoined={() => { fetchJoinedServers(); setShowBrowseServers(false); }}
        />
      )}
    </div>
  );
};

export default Chat;
