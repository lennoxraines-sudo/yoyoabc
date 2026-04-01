import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim() || `GUEST_${Math.floor(Math.random() * 9999)}`;
    sessionStorage.setItem("chat-username", name);
    navigate("/chat");
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 grid-bg pointer-events-none" />

      <div className="w-full max-w-md bg-card border-4 border-border cyber-glow p-8 relative z-10">
        {/* Animated icon */}
        <div className="w-12 h-12 bg-secondary mb-6 border-4 border-border flex items-center justify-center">
          <div className="w-4 h-4 bg-primary animate-ping" />
        </div>

        <h1 className="text-4xl font-bold mb-2 uppercase tracking-tighter text-foreground text-glow">
          yoyo's network chat
        </h1>
        <p className="text-muted-foreground mb-8 font-bold">
          Enter a username to jack into the network.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Identifier
            </label>
            <input
              className="w-full text-xl py-4 px-3 border-4 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="GUEST_1337"
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full text-xl py-4 px-8 border-4 border-border bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold tracking-tight transition-all hover:translate-y-1 hover:shadow-none cyber-glow"
          >
            Initialize Connection
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
