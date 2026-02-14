import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, List, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useApiClient, apiService } from '../../services/api'
import { MailingCustomList } from '../../types/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedUserIds: string[]
  onComplete: () => void
}

const AddToListModal: React.FC<Props> = ({ isOpen, onClose, selectedUserIds, onComplete }) => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset internal state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCreating(false)
      setNewListName('')
      setNewListDesc('')
      setLoading(false)
    }
  }, [isOpen])

  const { data: listsData } = useQuery({
    queryKey: ['mailing-custom-lists'],
    queryFn: async () => {
      const res = await apiService.mailingListCustomLists(apiClient, { pageSize: 100 })
      return res.data
    },
    enabled: isOpen,
  })

  const lists: MailingCustomList[] = listsData?.lists || []
  const hasUsers = selectedUserIds.length > 0

  const handleAddToExisting = async (listId: string, listName: string) => {
    if (!hasUsers) return
    setLoading(true)
    try {
      const res = await apiService.mailingAddUsersToList(apiClient, listId, selectedUserIds)
      toast.success(
        t('admin:mailing.customLists.addedToList', 'Added {{count}} user(s) to "{{name}}"', {
          count: res.data?.added ?? selectedUserIds.length,
          name: listName,
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
      onComplete()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return
    setLoading(true)
    let createdList: any = null
    try {
      const createRes = await apiService.mailingCreateCustomList(apiClient, {
        name: newListName.trim(),
        description: newListDesc.trim() || undefined,
      })
      createdList = createRes.data

      // Only add members if users were selected
      if (hasUsers) {
        await apiService.mailingAddUsersToList(apiClient, createdList.id, selectedUserIds)
        toast.success(
          t('admin:mailing.customLists.createdAndAdded', 'Created "{{name}}" and added {{count}} user(s)', {
            name: newListName.trim(),
            count: selectedUserIds.length,
          }),
        )
      } else {
        toast.success(
          t('admin:mailing.customLists.created', 'Created "{{name}}"', {
            name: newListName.trim(),
          }),
        )
      }

      queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
      onComplete()
      onClose()
    } catch (err: any) {
      // If list was created but adding members failed, still refresh
      if (createdList) {
        queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
        toast.error(
          t('admin:mailing.customLists.createdButAddFailed',
            'List "{{name}}" was created but adding members failed. You can add them from the Build tab.',
            { name: newListName.trim() }),
        )
      } else {
        toast.error(err?.response?.data?.message || 'Failed to create list')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {hasUsers
                ? t('admin:mailing.customLists.addToList', 'Add to List')
                : t('admin:mailing.customLists.createNewList', 'Create new list')}
            </h3>
            {hasUsers && (
              <p className="text-sm text-gray-500 mt-0.5">
                {t('admin:mailing.customLists.selectedCount', '{{count}} user(s) selected', {
                  count: selectedUserIds.length,
                })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Existing lists — only show when users are selected */}
          {hasUsers && lists.length > 0 && !creating && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin:mailing.customLists.existingLists', 'Existing Lists')}
              </p>
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToExisting(list.id, list.name)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left disabled:opacity-50"
                >
                  <List className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{list.name}</p>
                    <p className="text-xs text-gray-500">
                      {list._count?.members ?? 0} {t('admin:mailing.customLists.members', 'members')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create new list form */}
          {creating ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin:mailing.customLists.createNew', 'Create New List')}
              </p>
              <input
                type="text"
                placeholder={t('admin:mailing.customLists.namePlaceholder', 'List name')}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <input
                type="text"
                placeholder={t('admin:mailing.customLists.descPlaceholder', 'Description (optional)')}
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAndAdd}
                  disabled={loading || !newListName.trim()}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? t('admin:mailing.customLists.creating', 'Creating...')
                    : hasUsers
                      ? t('admin:mailing.customLists.createAndAdd', 'Create & Add Users')
                      : t('admin:mailing.customLists.create', 'Create List')}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common:cancel', 'Cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-sm font-medium text-blue-600">
                {t('admin:mailing.customLists.createNewList', 'Create new list')}
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddToListModal
