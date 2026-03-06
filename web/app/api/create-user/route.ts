import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {

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
    console.error(error);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({
    user: data.user,
    temporaryPassword: tempPassword
  });
}