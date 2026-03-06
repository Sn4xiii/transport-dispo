import { createClient } from "@supabase/supabase-js";
console.log("SERVICE KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0,10));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {

  const { email } = await req.json();

  const tempPassword = Math.random().toString(36).slice(-10);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({
    user: data.user,
    temporaryPassword: tempPassword
  });
}