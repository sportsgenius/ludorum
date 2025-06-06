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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserRole();
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setPermissions({});
        setLoading(false);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        setUserRole(null);
        setPermissions({});
        return;
      }

      console.log('Fetching role for user:', user.id);

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
        .limit(1);

      console.log('Role query result:', { roleData, roleError });

      if (roleError) {
        console.error('Role fetch error:', roleError);
        setError(`Role fetch failed: ${roleError.message}`);
        return;
      }

      if (!roleData || roleData.length === 0) {
        console.log('No active admin role found for user');
        setError('No admin role assigned');
        setUserRole(null);
        setPermissions({});
        return;
      }

      const activeRole = roleData[0];
      console.log('Active role found:', activeRole);

      if (!activeRole.admin_roles) {
        console.error('Role details not found');
        setError('Role configuration missing');
        return;
      }

      const userRoleWithDetails: UserRole = {
        ...activeRole,
        role_details: activeRole.admin_roles
      };

      console.log('Setting user role:', userRoleWithDetails);
      setUserRole(userRoleWithDetails);
      setPermissions(activeRole.admin_roles.permissions || {});
      setError(null);

    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user role');
      setUserRole(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    const result = permissions[permission] === true;
    console.log(`Permission check for '${permission}':`, result);
    return result;
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