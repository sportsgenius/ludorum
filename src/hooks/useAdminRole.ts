import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminRole {
  role_name: 'super_admin' | 'admin' | 'content_creator';
  display_name: string;
  permissions: Record<string, boolean>;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_name: 'super_admin' | 'admin' | 'content_creator';
  assigned_at: string;
  is_active: boolean;
  role_details?: AdminRole;
}

export function useAdminRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No authenticated user');
        return;
      }

      // Get user's role assignment with role details
      const { data: roleData, error: roleError } = await supabase
        .from('admin_role_assignments')
        .select(`
          *,
          admin_roles (
            role_name,
            display_name,
            permissions
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (roleError) {
        if (roleError.code === 'PGRST116') {
          setError('No admin role assigned');
        } else {
          throw roleError;
        }
        return;
      }

      const userRoleWithDetails: UserRole = {
        ...roleData,
        role_details: roleData.admin_roles
      };

      setUserRole(userRoleWithDetails);
      setPermissions(roleData.admin_roles?.permissions || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user role');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions[permission] === true;
  };

  const isRole = (role: 'super_admin' | 'admin' | 'content_creator'): boolean => {
    return userRole?.role_name === role;
  };

  const canManageRole = (targetRole: 'super_admin' | 'admin' | 'content_creator'): boolean => {
    if (!userRole) return false;
    
    // Super admin can manage all roles
    if (userRole.role_name === 'super_admin') return true;
    
    // Admin can manage content creators
    if (userRole.role_name === 'admin' && targetRole === 'content_creator') return true;
    
    return false;
  };

  return {
    userRole,
    permissions,
    loading,
    error,
    hasPermission,
    isRole,
    canManageRole,
    refetch: fetchUserRole
  };
}