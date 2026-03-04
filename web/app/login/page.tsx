"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./style.css";

export default function LoginPage(){

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");

  async function login(){

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      setError("Login fehlgeschlagen");
    }else{
      router.push("/weeks");
    }

  }

  return(

    <div className="login-page">

      <div className="login-card">

        <h1>Transportplan Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button onClick={login}>
          Login
        </button>

        {error && <p>{error}</p>}

      </div>

    </div>

  );
}