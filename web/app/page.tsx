"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home(){

  const router = useRouter();

  useEffect(()=>{

    async function check(){

      const { data } = await supabase.auth.getSession();

      if(!data.session){
        router.push("/login");
      }else{
        router.push("/transportplan");
      }

    }

    check();

  },[router]);

  return null;
}