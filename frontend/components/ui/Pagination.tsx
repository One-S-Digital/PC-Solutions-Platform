import React from 'react';
import Button from './Button';

interface PaginationProps {
  page: number; // 1-based
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalItems,
  pageSize,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize));
  const safePage = clamp(page, 1, totalPages);

  const from = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const to = Math.min(totalItems, safePage * safePageSize);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="text-sm text-gray-600 flex items-center gap-2">
            <span>Rows per page</span>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
              value={safePageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="text-sm text-gray-600">
          {from}-{to} of {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600 px-2">
          Page {safePage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

