"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type Permission = {
  key: string;
};

type RolePermission = {
  permissions: Permission | null;
};

type Role = {
  role_permissions: RolePermission[];
};

type ProfileQuery = {
  role_id: string;
  roles: Role | null;
};

export function usePermissions() {

  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {

    async function loadPermissions() {

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select(`
          role_id,
          roles!profiles_role_fk (
            role_permissions (
              permissions (
                key
              )
            )
          )
        `)
        .eq("id", user.id)
        .single();

      const profile = data as ProfileQuery | null;

      if (!profile?.roles) return;

      const keys =
        profile.roles.role_permissions
          ?.map(rp => rp.permissions?.key)
          .filter(Boolean) as string[];

      setPermissions(keys);

    }

    loadPermissions();

  }, []);

  function can(permission: string) {
    return permissions.includes(permission);
  }

  return { permissions, can };

}