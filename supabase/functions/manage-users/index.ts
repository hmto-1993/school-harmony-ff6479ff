import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

function passwordError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("weak") || lower.includes("password") || lower.includes("should be"))
    return "كلمة المرور ضعيفة، استخدم أحرف وأرقام ورموز (مثال: Teacher@2026)";
  if (lower.includes("same password"))
    return "لا يمكن استخدام نفس كلمة المرور الحالية";
  return msg;
}

Deno.serve(async (req) => {
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
      return ok({ error: "غير مصرح - يجب تسجيل الدخول" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return ok({ error: "غير مصرح - جلسة غير صالحة" });
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
      return ok({ error: "غير مصرح - صلاحيات غير كافية" });
    }

    // Resolve caller organization for tenant scoping
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("user_id", callerId)
      .maybeSingle();
    const callerOrg: string | null = callerProfile?.organization_id ?? null;

    // Determine if caller is the primary (system) owner
    const { data: primaryOwnerSetting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("id", "admin_primary_id")
      .maybeSingle();
    const primaryOwnerId: string = primaryOwnerSetting?.value || "";
    const isPrimaryOwner = !!primaryOwnerId && primaryOwnerId === callerId;

    // Helper: check that targetUserId belongs to the caller's org (primary owner bypasses)
    const assertSameOrg = async (targetId: string): Promise<string | null> => {
      if (isPrimaryOwner) return null;
      if (!callerOrg) return "غير مصرح - لا توجد مؤسسة للمستخدم";
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("organization_id")
        .eq("user_id", targetId)
        .maybeSingle();
      if (!targetProfile || targetProfile.organization_id !== callerOrg) {
        return "غير مصرح - المستخدم خارج نطاق مؤسستك";
      }
      return null;
    };

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
        const arabicMsg = msg.includes("already been registered")
          ? "البريد الإلكتروني مسجل مسبقاً"
          : passwordError(msg);
        return ok({ error: arabicMsg });
      }

      if (newUser?.user) {
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

      return ok({ success: true, user_id: newUser?.user?.id });
    }

    if (action === "change_password") {
      if (!targetUserId && !email) {
        return ok({ error: "معرف المستخدم أو البريد الإلكتروني مطلوب" });
      }
      if (!password) {
        return ok({ error: "كلمة المرور مطلوبة" });
      }

      let userId = targetUserId;

      if (!userId && email) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        const targetUser = users.find((u: any) => u.email === email);
        if (!targetUser) {
          return ok({ error: "المستخدم غير موجود" });
        }
        userId = targetUser.id;
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        return ok({ error: passwordError(updateError.message || "فشل تغيير كلمة المرور") });
      }

      return ok({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    }

    if (action === "update_teacher") {
      if (!targetUserId) {
        return ok({ error: "معرف المستخدم مطلوب" });
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

      if (role && (role === "admin" || role === "teacher")) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", targetUserId);
        if (roleError) throw roleError;
      }

      return ok({ success: true, message: "تم تحديث بيانات المعلم بنجاح" });
    }

    if (action === "delete_user") {
      if (!email) {
        return ok({ error: "البريد الإلكتروني مطلوب" });
      }

      // Prevent deleting the primary owner
      const { data: primarySetting } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("id", "admin_primary_id")
        .maybeSingle();
      const primaryOwnerId = primarySetting?.value || "";

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = users.find((u: any) => u.email === email);
      if (!targetUser) {
        return ok({ error: "المستخدم غير موجود" });
      }

      if (targetUser.id === callerId) {
        return ok({ error: "لا يمكنك حذف حسابك الخاص" });
      }

      if (targetUser.id === primaryOwnerId && callerId !== primaryOwnerId) {
        return ok({ error: "لا يمكن حذف حساب المالك الرئيسي" });
      }

      await supabaseAdmin.from("attendance_records").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("grades").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("manual_category_scores").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("behavior_records").update({ recorded_by: callerId }).eq("recorded_by", targetUser.id);
      await supabaseAdmin.from("lesson_plans").update({ created_by: callerId }).eq("created_by", targetUser.id);
      await supabaseAdmin.from("notifications").update({ created_by: callerId }).eq("created_by", targetUser.id);

      await supabaseAdmin.from("teacher_permissions").delete().eq("user_id", targetUser.id);
      await supabaseAdmin.from("teacher_classes").delete().eq("teacher_id", targetUser.id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUser.id);
      await supabaseAdmin.from("profiles").delete().eq("user_id", targetUser.id);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
      if (deleteError) {
        return ok({ error: "فشل حذف المستخدم: " + deleteError.message });
      }

      return ok({ success: true, message: "تم حذف المعلم بنجاح" });
    }

    if (action === "list_teachers") {
      // Get the primary owner ID to hide from the list
      const { data: primarySetting } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("id", "admin_primary_id")
        .maybeSingle();
      const primaryOwnerId = primarySetting?.value || "";

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["teacher", "admin"]);

      if (!roles || roles.length === 0) {
        return ok({ teachers: [] });
      }

      const staffIds = roles.map((r: any) => r.user_id);
      const roleMap: Record<string, string> = {};
      roles.forEach((r: any) => { roleMap[r.user_id] = r.role; });

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, national_id")
        .in("user_id", staffIds);

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const staffUsers = users.filter((u: any) => staffIds.includes(u.id));

      // Hide both the caller and the primary owner from the list
      const teachers = staffUsers
        .filter((u: any) => u.id !== callerId && u.id !== primaryOwnerId)
        .map((u: any) => {
          const profile = profiles?.find((p: any) => p.user_id === u.id);
          return {
            user_id: u.id,
            email: u.email,
            full_name: profile?.full_name || u.email,
            national_id: profile?.national_id || "",
            role: roleMap[u.id] || "teacher",
          };
        });

      return ok({ teachers });
    }

    if (action === "list_admins") {
      // Get the primary owner ID to hide from the list
      const { data: primarySetting } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("id", "admin_primary_id")
        .maybeSingle();
      const primaryOwnerId = primarySetting?.value || "";

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        return ok({ admins: [] });
      }

      const adminIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, national_id")
        .in("user_id", adminIds);

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const adminUsers = users.filter((u: any) => adminIds.includes(u.id) && u.id !== primaryOwnerId);

      const admins = adminUsers.map((u: any) => {
        const profile = profiles?.find((p: any) => p.user_id === u.id);
        return {
          user_id: u.id,
          email: u.email,
          full_name: profile?.full_name || u.email,
          national_id: profile?.national_id || "",
        };
      });

      return ok({ admins });
    }

    return ok({ error: "إجراء غير معروف" });
  } catch (error) {
    return ok({ error: error.message || "حدث خطأ غير متوقع" });
  }
});
