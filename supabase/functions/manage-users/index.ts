import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // --- Authentication: verify JWT and require admin role ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "غير مصرح - يجب تسجيل الدخول" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "غير مصرح - جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.user.id;

    // Check caller has admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "غير مصرح - صلاحيات غير كافية" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Process actions ---
    const { action, email, password, full_name, role, user_id: targetUserId, national_id } = await req.json();

    if (action === "create_user") {
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        const msg = error.message || "";
        const arabicMsg = (msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("password"))
          ? "كلمة المرور ضعيفة، استخدم أحرف وأرقام ورموز (مثال: Teacher@2026)"
          : msg.includes("already been registered") ? "البريد الإلكتروني مسجل مسبقاً" : msg;
        return new Response(
          JSON.stringify({ error: arabicMsg }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newUser?.user) {
        // Insert profile with national_id included
        await supabaseAdmin.from("profiles").insert({
          user_id: newUser.user.id,
          full_name: full_name || email,
          national_id: national_id || null,
        });
        await supabaseAdmin.from("user_roles").insert({
          user_id: newUser.user.id,
          role: role || "teacher",
        });
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUser?.user?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "change_password") {
      if (!targetUserId && !email) {
        return new Response(
          JSON.stringify({ error: "معرف المستخدم أو البريد الإلكتروني مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!password) {
        return new Response(
          JSON.stringify({ error: "كلمة المرور مطلوبة" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let userId = targetUserId;

      // If no user_id provided, find by email
      if (!userId && email) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        const targetUser = users.find((u) => u.email === email);
        if (!targetUser) {
          return new Response(
            JSON.stringify({ error: "المستخدم غير موجود" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = targetUser.id;
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        const msg = updateError.message || "";
        if (msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("password")) {
          return new Response(
            JSON.stringify({ error: "كلمة المرور ضعيفة، استخدم أحرف وأرقام ورموز (مثال: Teacher@2026)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم تغيير كلمة المرور بنجاح" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_teacher") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "معرف المستخدم مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: Record<string, string> = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (national_id !== undefined) updates.national_id = national_id;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("user_id", targetUserId);
        if (updateError) throw updateError;
      }

      // Update role if provided
      if (role && (role === "admin" || role === "teacher")) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", targetUserId);
        if (roleError) throw roleError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم تحديث بيانات المعلم بنجاح" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_user") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "البريد الإلكتروني مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = users.find((u) => u.email === email);
      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: "المستخدم غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent deleting yourself
      if (targetUser.id === callerId) {
        return new Response(
          JSON.stringify({ error: "لا يمكنك حذف حسابك الخاص" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Nullify references in attendance_records, grades, behavior_records, etc.
      await supabaseAdmin.from("attendance_records").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("grades").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("manual_category_scores").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("behavior_records").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("lesson_plans").update({ created_by: callerId }).eq("created_by", targetUser.id);
      await supabaseAdmin.from("notifications").update({ created_by: callerId }).eq("created_by", targetUser.id);

      // Delete owned data
      await supabaseAdmin.from("teacher_permissions").delete().eq("user_id", targetUser.id);
      await supabaseAdmin.from("teacher_classes").delete().eq("teacher_id", targetUser.id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUser.id);
      await supabaseAdmin.from("profiles").delete().eq("user_id", targetUser.id);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "فشل حذف المستخدم: " + deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم حذف المعلم بنجاح" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list_teachers") {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (!roles || roles.length === 0) {
        return new Response(
          JSON.stringify({ teachers: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const teacherIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, national_id")
        .in("user_id", teacherIds);

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const teacherUsers = users.filter((u) => teacherIds.includes(u.id));

      const teachers = teacherUsers.map((u) => {
        const profile = profiles?.find((p) => p.user_id === u.id);
        return {
          user_id: u.id,
          email: u.email,
          full_name: profile?.full_name || u.email,
          national_id: profile?.national_id || "",
        };
      });

      return new Response(
        JSON.stringify({ teachers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
