import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:8000",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {

  try {

    const body = await req.json();
    const email = body?.email;

    if (!email) {
      return Response.json(
        { error: "Email fehlt" },
        { status: 400 }
      );
    }

    const tempPassword = Math.random().toString(36).slice(-10);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });

    if (error) {

      console.error("CREATE USER ERROR:", error);

      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      user: data.user,
      temporaryPassword: tempPassword
    });

  } catch (err) {

    console.error("REQUEST ERROR:", err);

    return Response.json(
      { error: "Server Fehler" },
      { status: 500 }
    );

  }

}