import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_username, reason, duration_minutes, ip_address } = await req.json();

    // Resolve target user_id from username
    let targetUserId: string | null = null;
    if (target_username) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", target_username)
        .single();
      if (!profile) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = profile.id;
    }

    let result;

    switch (action) {
      case "ban": {
        if (!targetUserId) throw new Error("target_username required");
        const { error } = await supabaseAdmin.from("bans").upsert({
          user_id: targetUserId,
          banned_by: user.id,
          reason: reason || "",
        }, { onConflict: "user_id" });
        if (error) throw error;
        result = { success: true, message: `${target_username} has been banned` };
        break;
      }
      case "unban": {
        if (!targetUserId) throw new Error("target_username required");
        const { error } = await supabaseAdmin.from("bans").delete().eq("user_id", targetUserId);
        if (error) throw error;
        result = { success: true, message: `${target_username} has been unbanned` };
        break;
      }
      case "ip_ban": {
        if (!ip_address) throw new Error("ip_address required");
        const { error } = await supabaseAdmin.from("ip_bans").upsert({
          ip_address,
          banned_by: user.id,
          reason: reason || "",
        }, { onConflict: "ip_address" });
        if (error) throw error;
        result = { success: true, message: `IP ${ip_address} has been banned` };
        break;
      }
      case "unip_ban": {
        if (!ip_address) throw new Error("ip_address required");
        const { error } = await supabaseAdmin.from("ip_bans").delete().eq("ip_address", ip_address);
        if (error) throw error;
        result = { success: true, message: `IP ${ip_address} has been unbanned` };
        break;
      }
      case "silence": {
        if (!targetUserId) throw new Error("target_username required");
        if (!duration_minutes) throw new Error("duration_minutes required");
        const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();
        const { error } = await supabaseAdmin.from("silences").insert({
          user_id: targetUserId,
          silenced_by: user.id,
          reason: reason || "",
          expires_at: expiresAt,
        });
        if (error) throw error;
        result = { success: true, message: `${target_username} silenced for ${duration_minutes} minutes` };
        break;
      }
      case "unsilence": {
        if (!targetUserId) throw new Error("target_username required");
        const { error } = await supabaseAdmin.from("silences").delete().eq("user_id", targetUserId);
        if (error) throw error;
        result = { success: true, message: `${target_username} has been unsilenced` };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
