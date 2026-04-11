export type Message = {
  id: string;
  username: string;
  content: string;
  channel: string;
  created_at: string;
  server_id?: string | null;
};

export type DirectMessage = {
  id: string;
  sender_username: string;
  receiver_username: string;
  content: string;
  created_at: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  server_id?: string | null;
};

export type OnlineUser = {
  username: string;
  channel: string;
};

export type AllUser = {
  username: string;
  id: string;
};

export type Server = {
  id: string;
  name: string;
  description: string;
  icon: string;
  owner_id: string;
  created_at: string;
};

export type ServerMember = {
  id: string;
  server_id: string;
  user_id: string;
  role: "owner" | "moderator" | "member";
  joined_at: string;
};

export type ChatView =
  | { type: "channel"; name: string }
  | { type: "dm"; username: string };
