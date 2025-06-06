import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Shield, Users, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminRole } from '../../hooks/useAdminRole';

interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AdminAssignment {
  id: string;
  user_id: string;
  role_name: 'super_admin' | 'admin' | 'content_creator';
  assigned_at: string;
  is_active: boolean;
  assigned_by: string;
  user?: User;
  assigned_by_user?: User;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user?: User;
}

const AdminManagement: React.FC = () => {
  const { userRole, hasPermission, canManageRole } = useAdminRole();
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AdminAssignment | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'activity'>('assignments');
  const [formData, setFormData] = useState({
    user_id: '',
    role_name: 'content_creator' as 'super_admin' | 'admin' | 'content_creator',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('admin_management')) {
      fetchAssignments();
      fetchActivityLogs();
      fetchUsers();
    }
  }, [hasPermission]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_role_assignments')
        .select(`
          *,
          user:user_id (
            id,
            email,
            created_at,
            user_metadata
          ),
          assigned_by_user:assigned_by (
            id,
            email,
            user_metadata
          )
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to fetch admin assignments');
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          user:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const logActivity = async (action: string, entityType?: string, entityId?: string, oldValues?: any, newValues?: any) => {
    try {
      await supabase.rpc('log_admin_activity', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_old_values: oldValues,
        p_new_values: newValues
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let targetUserId = formData.user_id;

      // If creating new user by email
      if (!targetUserId && formData.email) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: Math.random().toString(36).slice(-8), // Temporary password
          email_confirm: true
        });

        if (authError) throw authError;
        targetUserId = authData.user.id;
      }

      if (!targetUserId) {
        throw new Error('No user selected or created');
      }

      // Check if user can manage this role
      if (!canManageRole(formData.role_name)) {
        throw new Error('Insufficient permissions to assign this role');
      }

      // Prevent self-demotion for super admins
      if (userRole?.user_id === targetUserId && userRole.role_name === 'super_admin') {
        throw new Error('Cannot modify your own super admin role');
      }

      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('admin_role_assignments')
          .update({
            role_name: formData.role_name,
            assigned_by: userRole?.user_id
          })
          .eq('id', editingAssignment.id);

        if (error) throw error;

        await logActivity(
          'role_updated',
          'admin_role_assignment',
          editingAssignment.id,
          { role_name: editingAssignment.role_name },
          { role_name: formData.role_name }
        );
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('admin_role_assignments')
          .insert({
            user_id: targetUserId,
            role_name: formData.role_name,
            assigned_by: userRole?.user_id
          });

        if (error) throw error;

        await logActivity(
          'role_assigned',
          'admin_role_assignment',
          targetUserId,
          null,
          { role_name: formData.role_name, user_id: targetUserId }
        );
      }

      await fetchAssignments();
      await fetchActivityLogs();
      resetForm();
    } catch (err) {
      console.error('Error saving assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignment: AdminAssignment) => {
    if (!canManageRole(assignment.role_name)) {
      setError('Insufficient permissions to remove this role');
      return;
    }

    // Prevent self-deletion
    if (assignment.user_id === userRole?.user_id) {
      setError('Cannot remove your own admin access');
      return;
    }

    // Check if this would remove the last super admin
    if (assignment.role_name === 'super_admin') {
      const superAdminCount = assignments.filter(a => a.role_name === 'super_admin').length;
      if (superAdminCount <= 1) {
        setError('Cannot remove the last super admin');
        return;
      }
    }

    if (!confirm(`Are you sure you want to remove ${assignment.role_name} access from this user?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_role_assignments')
        .update({ is_active: false })
        .eq('id', assignment.id);

      if (error) throw error;

      await logActivity(
        'role_removed',
        'admin_role_assignment',
        assignment.id,
        { role_name: assignment.role_name, is_active: true },
        { is_active: false }
      );

      await fetchAssignments();
      await fetchActivityLogs();
    } catch (err) {
      console.error('Error removing assignment:', err);
      setError('Failed to remove assignment');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      role_name: 'content_creator',
      email: ''
    });
    setEditingAssignment(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleEdit = (assignment: AdminAssignment) => {
    if (!canManageRole(assignment.role_name)) {
      setError('Insufficient permissions to edit this role');
      return;
    }

    setFormData({
      user_id: assignment.user_id,
      role_name: assignment.role_name,
      email: assignment.user?.email || ''
    });
    setEditingAssignment(assignment);
    setIsFormOpen(true);
  };

  if (!hasPermission('admin_management')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-500 dark:text-gray-400">You don't have permission to manage admin users.</p>
        </div>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300';
      case 'content_creator':
        return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Management</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Admin User
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Admin Users
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Eye className="h-4 w-4 inline mr-2" />
            Activity Logs
          </button>
        </nav>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingAssignment ? 'Edit Admin User' : 'Add Admin User'}
            </h3>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {!editingAssignment && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Existing User
                    </label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value, email: '' }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    >
                      <option value="">Select existing user</option>
                      {users.filter(user => !assignments.some(a => a.user_id === user.id)).map(user => (
                        <option key={user.id} value={user.id}>
                          {user.email} {user.user_metadata?.full_name && `(${user.user_metadata.full_name})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Or Create New User
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value, user_id: '' }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                </>
              )}

              <div className={editingAssignment ? 'sm:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role *
                </label>
                <select
                  value={formData.role_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value as any }))}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                >
                  {canManageRole('content_creator') && (
                    <option value="content_creator">Content Creator</option>
                  )}
                  {canManageRole('admin') && (
                    <option value="admin">Admin</option>
                  )}
                  {canManageRole('super_admin') && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingAssignment ? 'Update' : 'Create'} User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      {activeTab === 'assignments' && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assigned By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assigned At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {assignment.user?.email}
                      </div>
                      {assignment.user?.user_metadata?.full_name && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.user.user_metadata.full_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(assignment.role_name)}`}>
                      {assignment.role_name.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {assignment.assigned_by_user?.email || 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(assignment.assigned_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageRole(assignment.role_name) && assignment.user_id !== userRole?.user_id && (
                      <>
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Recent Admin Activity
            </h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {activityLogs.map((log, index) => (
                  <li key={log.id} className="relative pb-8">
                    {index !== activityLogs.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                          <Shield className="h-5 w-5 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {log.user?.email || 'System'}
                            </span>{' '}
                            {log.action.replace('_', ' ')}
                            {log.entity_type && (
                              <span className="text-gray-600 dark:text-gray-300">
                                {' '}on {log.entity_type}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;