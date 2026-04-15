import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TABLES_TO_BACKUP = [
  "profiles",
  "quiz_progress",
  "user_waivers",
  "events",
  "event_rsvps",
  "event_feedback",
  "circles",
  "circle_members",
  "notifications",
  "user_roles",
  "retest_permissions",
  "archived_quiz_results",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting automated backup...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupData: Record<string, unknown[]> = {};

    for (const table of TABLES_TO_BACKUP) {
      console.log(`Backing up: ${table}`);
      const { data, error } = await supabase.from(table).select("*");
      backupData[table] = error ? [] : (data || []);
      console.log(`${table}: ${backupData[table].length} rows`);
    }

    const backupContent = JSON.stringify({
      backup_timestamp: new Date().toISOString(),
      tables: backupData,
      row_counts: Object.fromEntries(
        Object.entries(backupData).map(([k, v]) => [k, v.length])
      ),
    }, null, 2);

    const fileName = `backup-${timestamp}.json`;
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(fileName, backupContent, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const totalRows = Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0);

    return new Response(JSON.stringify({
      success: true,
      file_name: fileName,
      tables_backed_up: TABLES_TO_BACKUP.length,
      total_rows: totalRows,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
