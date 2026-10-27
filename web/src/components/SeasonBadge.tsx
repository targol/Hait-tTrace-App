import React from 'react';
import { Sprout, Sun, Flame, Snowflake } from 'lucide-react';
import { PERSIAN_SEASONS } from '../calendar/jalali';

interface Props {
  seasonIndex?: number;
  showIconOnly?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const SeasonBadge: React.FC<Props> = ({
  seasonIndex = 0,
  showIconOnly = false,
  size = 'xs',
  className = '',
}) => {
  const sIdx = Math.max(0, Math.min(3, seasonIndex));
  const season = PERSIAN_SEASONS[sIdx] || PERSIAN_SEASONS[0];

  const renderIcon = (iconClass: string) => {
    switch (sIdx) {
      case 0:
        return <Sprout className={iconClass} />;
      case 1:
        return <Sun className={iconClass} />;
      case 2:
        return <Flame className={iconClass} />;
      case 3:
      default:
        return <Snowflake className={iconClass} />;
    }
  };

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${season.bgClass} ${sizeClasses} ${className}`}
      title={`فصل ${season.name}`}
    >
      {renderIcon(iconSizes)}
      {!showIconOnly && <span>{season.name}</span>}
    </span>
  );
};
