import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize));
  const safePage = clamp(page, 1, totalPages);

  const from = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const to = Math.min(totalItems, safePage * safePageSize);

  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
        {onPageSizeChange && (
          <label className="text-sm text-gray-600 flex items-center gap-2">
            <span>{t('pagination.rowsPerPage', 'Rows per page')}</span>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 pr-8 text-sm leading-5 bg-white min-w-[4.5rem]"
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
          {t('pagination.range', '{{from}}-{{to}} of {{total}}', { from, to, total: totalItems })}
        </span>
      </div>

      <div className="flex items-center gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          {t('pagination.previous', 'Previous')}
        </Button>
        <span className="text-sm text-gray-600 px-2">
          {t('pagination.pageOf', 'Page {{page}} of {{totalPages}}', { page: safePage, totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          {t('pagination.next', 'Next')}
        </Button>
      </div>

      {/* Spacer column so the pagination controls stay centered on larger screens */}
      <div className="hidden sm:block" />
    </div>
  );
};

export default Pagination;

