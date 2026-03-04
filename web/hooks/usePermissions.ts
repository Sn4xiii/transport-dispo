"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type Permission = {
  key: string;
};

type RolePermissions = {
  role: {
    role_permissions: {
      permissions: Permission;
    }[];
  };
};

export function usePermissions(){

  const [permissions,setPermissions] = useState<string[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{

    async function load(){

      const { data:userData } = await supabase.auth.getUser();
      const user = userData.user;

      if(!user){
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select(`
          role,
          roles!profiles_role_fkey (
            role_permissions (
              permissions (
                key
              )
            )
          )
        `)
        .eq("id",user.id)
        .single();

      const roleData = data as unknown as RolePermissions;

      const keys =
        roleData?.role?.role_permissions?.map(
          rp => rp.permissions.key
        ) ?? [];

      setPermissions(keys);
      setLoading(false);

    }

    load();

  },[]);

  function can(permission:string){

    if(permissions.includes("*")) return true;

    return permissions.includes(permission);

  }

  return { permissions, can, loading };

}