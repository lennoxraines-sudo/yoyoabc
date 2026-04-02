export type Message = {
  id: string;
  username: string;
  content: string;
  channel: string;
  created_at: string;
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
};

export type OnlineUser = {
  username: string;
  channel: string;
};

export type ChatView = 
  | { type: "channel"; name: string }
  | { type: "dm"; username: string };
