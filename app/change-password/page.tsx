"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ChangePassword() {

  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function updatePassword() {

    setError("");

    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    /* PASSWORT ÄNDERN */

    const { error: updateError } = await supabase.auth.updateUser({
      password
    });

    if (updateError) {
      setError("Passwort konnte nicht geändert werden");
      return;
    }

    /* USER LADEN */

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("User konnte nicht geladen werden");
      return;
    }

    const user = userData.user;

    /* PROFILE UPDATE */

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    if (profileError) {
      setError("Profil konnte nicht aktualisiert werden");
      return;
    }

    router.push("/weeks");
  }

  return (

    <div className="login-page">

      <div className="login-card">

        <h1>Passwort ändern</h1>

        <input
          type="password"
          placeholder="Neues Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Passwort bestätigen"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button onClick={updatePassword}>
          Passwort speichern
        </button>

        {error && <p>{error}</p>}

      </div>

    </div>

  );
}