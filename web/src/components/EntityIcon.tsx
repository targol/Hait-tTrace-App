import React from 'react';
import { Target, Layers, CheckSquare, Flame } from 'lucide-react';

export type EntityType = 'ANNUAL_GOAL' | 'INTERMEDIATE_GOAL' | 'TASK' | 'HABIT';

interface EntityConfig {
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  colorHex: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const ENTITY_CONFIG: Record<EntityType, EntityConfig> = {
  ANNUAL_GOAL: {
    label: 'هدف کلان سالانه',
    shortLabel: 'سالانه',
    icon: Target,
    colorHex: '#047857', // Emerald 700
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    badgeBg: 'bg-emerald-100/90',
    badgeBorder: 'border-emerald-300',
    badgeText: 'text-emerald-800',
  },
  INTERMEDIATE_GOAL: {
    label: 'هدف میانی',
    shortLabel: 'میانی',
    icon: Layers,
    colorHex: '#6366f1', // Indigo 500
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    badgeBg: 'bg-indigo-100/90',
    badgeBorder: 'border-indigo-300',
    badgeText: 'text-indigo-800',
  },
  TASK: {
    label: 'تسک اجرایی',
    shortLabel: 'تسک',
    icon: CheckSquare,
    colorHex: '#0284c7', // Sky 600
    textColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    badgeBg: 'bg-sky-100/90',
    badgeBorder: 'border-sky-300',
    badgeText: 'text-sky-800',
  },
  HABIT: {
    label: 'عادت روزانه/هفتگی',
    shortLabel: 'عادت',
    icon: Flame,
    colorHex: '#d97706', // Amber 600
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    badgeBg: 'bg-amber-100/90',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-800',
  },
};

interface EntityIconProps {
  type: EntityType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showBackground?: boolean;
  monochrome?: boolean;
}

export const EntityIcon: React.FC<EntityIconProps> = ({
  type,
  size = 'sm',
  className = '',
  showBackground = true,
  monochrome = false,
}) => {
  const config = ENTITY_CONFIG[type];
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: { box: 'w-5 h-5 rounded-md', icon: 'w-3 h-3' },
    sm: { box: 'w-6 h-6 rounded-lg', icon: 'w-3.5 h-3.5' },
    md: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4' },
    lg: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  }[size];

  if (!showBackground) {
    return (
      <IconComponent
        className={`${sizeClasses.icon} ${monochrome ? 'text-gray-700' : config.textColor} ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border ${sizeClasses.box} ${
        monochrome
          ? 'bg-gray-100 border-gray-300 text-gray-700'
          : `${config.bgColor} ${config.borderColor} ${config.textColor}`
      } ${className}`}
      title={config.label}
    >
      <IconComponent className={sizeClasses.icon} />
    </div>
  );
};

interface EntityBadgeProps {
  type: EntityType;
  customLabel?: string;
  size?: 'xs' | 'sm';
  monochrome?: boolean;
}

export const EntityBadge: React.FC<EntityBadgeProps> = ({
  type,
  customLabel,
  size = 'sm',
  monochrome = false,
}) => {
  const config = ENTITY_CONFIG[type];
  const IconComponent = config.icon;

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-[11px] px-2 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border shrink-0 ${sizeClasses} ${
        monochrome
          ? 'bg-gray-100 text-gray-700 border-gray-300'
          : `${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`
      }`}
      title={config.label}
    >
      <IconComponent className="w-3 h-3 shrink-0" />
      <span>{customLabel || config.shortLabel}</span>
    </span>
  );
};
