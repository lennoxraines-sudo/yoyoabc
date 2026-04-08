import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useModeration = (userId: string | null) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [silencedUntil, setSilencedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const checkStatus = async () => {
      // Check admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin");
      setIsAdmin((roles?.length ?? 0) > 0);

      // Check ban
      const { data: bans } = await supabase
        .from("bans")
        .select("id")
        .eq("user_id", userId);
      setIsBanned((bans?.length ?? 0) > 0);

      // Check silence
      const { data: silences } = await supabase
        .from("silences")
        .select("expires_at")
        .eq("user_id", userId)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);
      setSilencedUntil(silences && silences.length > 0 ? silences[0].expires_at : null);
    };

    checkStatus();
  }, [userId]);

  const isSilenced = silencedUntil ? new Date(silencedUntil) > new Date() : false;

  const moderate = useCallback(
    async (action: string, opts: { target_username?: string; reason?: string; duration_minutes?: number; ip_address?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("moderate", {
        body: { action, ...opts },
      });

      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    []
  );

  return { isAdmin, isBanned, isSilenced, silencedUntil, moderate };
};
