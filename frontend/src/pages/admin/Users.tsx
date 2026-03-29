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
          <h2 className="text-3xl font-display font-bold text-gray-100 mb-1">Users</h2>
          <p className="text-gray-400">Manage platform users and their accounts</p>
        </div>

        <Card className="bg-stone-800 border border-stone-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-900">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-400 uppercase">Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-400 uppercase">Email</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-400 uppercase">Phone</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-400 uppercase">Role</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-400 uppercase">Status</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-400">
                      <Spinner /> Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="border-b border-stone-700 hover:bg-stone-700/50 transition">
                      <td className="py-3 px-6 text-sm text-white font-medium">{user.name}</td>
                      <td className="py-3 px-6 text-sm text-stone-300">{user.email || '-'}</td>
                      <td className="py-3 px-6 text-sm text-stone-300">{user.phone || '-'}</td>
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
                              ? 'text-stone-400 hover:text-red-400 hover:bg-red-600/20'
                              : 'text-stone-400 hover:text-green-400 hover:bg-green-600/20'
                          }`}
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
