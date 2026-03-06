"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import "./permissions.css";

type Role = {
  id: string;
  name: string;
};

type Permission = {
  id: string;
  key: string;
};

type RolePermission = {
  role_id: string;
  permission_id: string;
};

export default function PermissionsPage(){

  const [roles,setRoles] = useState<Role[]>([]);
  const [permissions,setPermissions] = useState<Permission[]>([]);
  const [rolePermissions,setRolePermissions] = useState<RolePermission[]>([]);

  const [loading,setLoading] = useState(true);

  useEffect(()=>{

    async function load(){

      const { data:rolesData } = await supabase
      .from("roles")
      .select("*")
      .order("name");

      const { data:permissionsData } = await supabase
      .from("permissions")
      .select("*")
      .order("key");

      const { data:rp } = await supabase
      .from("role_permissions")
      .select("*");

      if(rolesData) setRoles(rolesData);
      if(permissionsData) setPermissions(permissionsData);
      if(rp) setRolePermissions(rp);

      setLoading(false);

    }

    load();

  },[]);

  function hasPermission(roleId:string,permissionId:string){

    return rolePermissions.some(
      rp => rp.role_id === roleId && rp.permission_id === permissionId
    );

  }

  async function toggle(roleId:string,permissionId:string){

    const exists = hasPermission(roleId,permissionId);

    if(exists){

      await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id",roleId)
      .eq("permission_id",permissionId);

      setRolePermissions(prev =>
        prev.filter(
          rp => !(rp.role_id === roleId && rp.permission_id === permissionId)
        )
      );

    }else{

      await supabase
      .from("role_permissions")
      .insert({
        role_id:roleId,
        permission_id:permissionId
      });

      setRolePermissions(prev => [
        ...prev,
        {role_id:roleId,permission_id:permissionId}
      ]);

    }

  }

  if(loading) return <div className="perm-loading">Loading...</div>;

  return(

    <div className="permissions-container">

      <h1 className="permissions-title">
        Permissions Verwaltung
      </h1>

      <div className="permissions-table-wrapper">

        <table className="permissions-table">

          <thead>

            <tr>

              <th>Permission</th>

              {roles.map(role=>(
                <th key={role.id}>{role.name}</th>
              ))}

            </tr>

          </thead>

          <tbody>

            {permissions.map(permission=>(

              <tr key={permission.id}>

                <td className="perm-name">
                  {permission.key}
                </td>

                {roles.map(role=>{

                  const checked = hasPermission(role.id,permission.id);

                  return(

                    <td key={role.id}>

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={()=>toggle(role.id,permission.id)}
                      />

                    </td>

                  );

                })}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}