import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          toast.error("Username is required");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() },
          },
        });
        if (error) throw error;
        navigate("/chat");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/chat");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 grid-bg pointer-events-none" />

      <div className="w-full max-w-md bg-card border-4 border-border cyber-glow p-8 relative z-10">
        <div className="w-12 h-12 bg-secondary mb-6 border-4 border-border flex items-center justify-center">
          <div className="w-4 h-4 bg-primary animate-ping" />
        </div>

        <h1 className="text-4xl font-bold mb-2 uppercase tracking-tighter text-foreground text-glow">
          yoyo's network chat
        </h1>
        <p className="text-muted-foreground mb-8 font-bold">
          {isSignUp ? "Create an account to jack into the network." : "Sign in to jack into the network."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
                Username
              </label>
              <input
                className="w-full text-lg py-3 px-3 border-4 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="GUEST_1337"
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              className="w-full text-lg py-3 px-3 border-4 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="user@network.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              className="w-full text-lg py-3 px-3 border-4 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full text-xl py-4 px-8 border-4 border-border bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold tracking-tight transition-all hover:translate-y-1 hover:shadow-none cyber-glow disabled:opacity-50"
          >
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Initialize Connection"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest font-bold"
        >
          {isSignUp ? "Already have an account? Sign in" : "New user? Create account"}
        </button>
      </div>
    </div>
  );
};

export default Login;
