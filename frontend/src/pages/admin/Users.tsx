import React, { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Card, Badge, Spinner } from '../../components/ui'
import { Ban, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { userApi } from '../../services/api'
import type { User } from '../../types'

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userApi.getAll({ page: 1, pageSize: 100 })
      setUsers(data.items)
    } catch (error) {
      console.error('Failed to load users', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await userApi.setActive(userId, !currentStatus)
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive: !currentStatus } : u)))
      toast.success(currentStatus ? 'User deactivated' : 'User activated')
    } catch (error) {
      console.error('Status update failed', error)
      toast.error('Failed to update user status')
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-stone-100 mb-1">Users</h2>
          <p className="text-stone-300">Manage platform users and their accounts</p>
        </div>

        <Card className="overflow-hidden border border-stone-700/80 bg-gradient-to-b from-stone-900 to-stone-950 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-900/90">
                  <th className="text-left py-3 px-6 text-xs font-semibold tracking-wider text-stone-300 uppercase">Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold tracking-wider text-stone-300 uppercase">Email</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold tracking-wider text-stone-300 uppercase">Phone</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold tracking-wider text-stone-300 uppercase">Role</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold tracking-wider text-stone-300 uppercase">Status</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold tracking-wider text-stone-300 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-300">
                      <Spinner /> Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-300">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className={`border-b border-stone-700/70 transition-colors ${idx % 2 === 0 ? 'bg-stone-900/45' : 'bg-stone-800/45'} hover:bg-forest-800/25`}
                    >
                      <td className="py-3 px-6 text-sm text-stone-100 font-semibold">{user.name || '-'}</td>
                      <td className="py-3 px-6 text-sm text-stone-200">{user.email || '-'}</td>
                      <td className="py-3 px-6 text-sm text-stone-200">{user.phone || '-'}</td>
                      <td className="py-3 px-6">
                        <Badge variant={user.role === 'farmer' ? 'purple' : user.role === 'admin' ? 'red' : 'blue'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-6">
                        <Badge variant={user.isActive ? 'green' : 'gray'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="py-3 px-6">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={`p-1 rounded transition ${
                            user.isActive
                              ? 'text-stone-200 hover:text-red-300 hover:bg-red-600/20'
                              : 'text-stone-200 hover:text-green-300 hover:bg-green-600/20'
                          }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}
