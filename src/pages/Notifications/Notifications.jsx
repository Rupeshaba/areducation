import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function Notifications() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications', 'notif-count']),
  })

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries(['notifications', 'notif-count']); toast.success('All marked as read') },
  })

  const deleteNotif = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries(['notifications', 'notif-count']),
  })

  const deleteAllNotif = useMutation({
    mutationFn: () => api.delete('/notifications/clear-all'),
    onSuccess: () => { qc.invalidateQueries(['notifications', 'notif-count']); toast.success('All notifications deleted') },
  })

  const notifications = data?.notifications || []
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>}
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={() => markAll.mutate()} className="btn-ghost text-sm flex items-center gap-1.5">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => deleteAllNotif.mutate()} disabled={deleteAllNotif.isPending} className="btn-ghost text-sm flex items-center gap-1.5 text-red-500 hover:text-red-600">
              <Trash2 size={14} /> Delete All
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bell size={32} className="mx-auto mb-3 opacity-40" />
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card flex items-start gap-3 transition-all ${!notif.read ? 'border-primary-500/25 bg-primary-500/5' : 'hover:border-gray-300'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-primary-500/15' : 'bg-gray-100'}`}>
                <Bell size={14} className={!notif.read ? 'text-primary-500' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{notif.title}</div>
                {notif.message && <div className="text-gray-500 text-sm mt-0.5">{notif.message}</div>}
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!notif.read && (
                  <button onClick={() => markRead.mutate(notif.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-500 transition-colors">
                    <Check size={14} />
                  </button>
                )}
                {notif.personal && (
                  <button onClick={() => deleteNotif.mutate(notif.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
