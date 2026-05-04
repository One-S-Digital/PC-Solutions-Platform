import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export interface ItemListEditorColumn<T> {
  label: string
  render: (item: T) => React.ReactNode
}

interface ItemListEditorProps<T extends { id: string }> {
  title: string
  items: T[]
  columns: ItemListEditorColumn<T>[]
  emptyMessage?: string
  onAdd: () => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  disabled?: boolean
}

export function ItemListEditor<T extends { id: string }>({
  title,
  items,
  columns,
  emptyMessage = 'No items yet.',
  onAdd,
  onEdit,
  onDelete,
  disabled = false,
}: ItemListEditorProps<T>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        {!disabled && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 py-4 text-center text-sm text-gray-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 gap-6">
                {columns.map((col, i) => (
                  <div key={i} className="min-w-0">
                    <p className="text-xs text-gray-400">{col.label}</p>
                    <p className="truncate text-sm text-gray-800">{col.render(item)}</p>
                  </div>
                ))}
              </div>
              {!disabled && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Generic form modal ───────────────────────────────────────────────────────

interface ItemFormModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  isLoading?: boolean
  children: React.ReactNode
}

export function ItemFormModal({ title, isOpen, onClose, onSubmit, isLoading, children }: ItemFormModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
