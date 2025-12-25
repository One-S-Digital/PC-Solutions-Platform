import React, { useState } from 'react';
import { DateOverride, formatTimeSlot } from '../../types/availability';
import DateOverrideModal from './DateOverrideModal';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CalendarIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DateOverridesListProps {
  overrides: DateOverride[];
  onChange: (overrides: DateOverride[]) => void;
  disabled?: boolean;
}

const DateOverridesList: React.FC<DateOverridesListProps> = ({
  overrides,
  onChange,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<DateOverride | undefined>();

  // Sort overrides by date
  const sortedOverrides = [...overrides].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleAdd = () => {
    setEditingOverride(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (override: DateOverride) => {
    setEditingOverride(override);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    onChange(overrides.filter(o => o.id !== id));
  };

  const handleSave = (override: DateOverride) => {
    if (editingOverride) {
      // Update existing
      onChange(overrides.map(o => o.id === override.id ? override : o));
    } else {
      // Add new
      onChange([...overrides, override]);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filter out past overrides for display
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureOverrides = sortedOverrides.filter(o => new Date(o.date) >= today);
  const pastOverrides = sortedOverrides.filter(o => new Date(o.date) < today);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Date Overrides</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Mark specific dates as unavailable or add custom hours
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-swiss-mint 
              bg-swiss-mint/10 hover:bg-swiss-mint/20 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Override
          </button>
        )}
      </div>

      {/* Overrides list */}
      {futureOverrides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <CalendarIcon className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No date overrides set</p>
          <p className="text-xs text-gray-400 mt-1">
            Add overrides for holidays, vacations, or extra hours
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {futureOverrides.map((override) => (
            <div
              key={override.id}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-colors
                ${override.type === 'UNAVAILABLE' 
                  ? 'bg-red-50 border-red-100' 
                  : 'bg-swiss-mint/5 border-swiss-mint/20'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${override.type === 'UNAVAILABLE' 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-swiss-mint/20 text-swiss-mint'
                    }
                  `}
                >
                  {override.type === 'UNAVAILABLE' ? (
                    <XCircleIcon className="w-4 h-4" />
                  ) : (
                    <ClockIcon className="w-4 h-4" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(override.date)}
                    </span>
                    {override.reason && (
                      <span className="text-xs px-2 py-0.5 bg-white/80 rounded text-gray-600">
                        {override.reason}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${override.type === 'UNAVAILABLE' ? 'text-red-600' : 'text-swiss-mint'}`}>
                    {override.type === 'UNAVAILABLE' 
                      ? 'Unavailable' 
                      : override.slots?.map(formatTimeSlot).join(', ') || 'Custom hours'
                    }
                  </span>
                </div>
              </div>

              {!disabled && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(override)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(override.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/50 rounded transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Past overrides (collapsed) */}
      {pastOverrides.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-500">
            {pastOverrides.length} past override{pastOverrides.length !== 1 ? 's' : ''} (click to expand)
          </summary>
          <div className="mt-2 space-y-1 opacity-50">
            {pastOverrides.map((override) => (
              <div
                key={override.id}
                className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm"
              >
                <span className="text-gray-500">{formatDate(override.date)}</span>
                <span className="text-xs text-gray-400">
                  {override.type === 'UNAVAILABLE' ? 'Unavailable' : 'Custom'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal */}
      <DateOverrideModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOverride(undefined);
        }}
        onSave={handleSave}
        existingOverride={editingOverride}
        existingDates={overrides.map(o => o.date)}
      />
    </div>
  );
};

export default DateOverridesList;
