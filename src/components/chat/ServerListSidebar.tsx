import { useState } from "react";
import { Server } from "./types";
import { Plus, Globe, Search } from "lucide-react";

type Props = {
  servers: Server[];
  currentServerId: string | null;
  onSelectServer: (serverId: string | null) => void;
  onCreateServer: () => void;
  onBrowseServers: () => void;
};

const ServerListSidebar = ({
  servers,
  currentServerId,
  onSelectServer,
  onCreateServer,
  onBrowseServers,
}: Props) => {
  return (
    <div className="relative z-10 w-16 flex-shrink-0 border-r-2 border-border bg-card/80 flex flex-col items-center py-3 gap-2">
      {/* Global server */}
      <button
        onClick={() => onSelectServer(null)}
        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${
          currentServerId === null
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        }`}
        title="Global"
      >
        🌐
      </button>

      <div className="w-8 h-0.5 bg-border/50 my-1" />

      {/* Joined servers */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 w-full px-1">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => onSelectServer(server.id)}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all flex-shrink-0 ${
              currentServerId === server.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
            title={server.name}
          >
            {server.icon}
          </button>
        ))}
      </div>

      <div className="w-8 h-0.5 bg-border/50 my-1" />

      {/* Browse servers */}
      <button
        onClick={onBrowseServers}
        className="w-11 h-11 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
        title="Browse Servers"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Create server */}
      <button
        onClick={onCreateServer}
        className="w-11 h-11 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
        title="Create Server"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ServerListSidebar;
