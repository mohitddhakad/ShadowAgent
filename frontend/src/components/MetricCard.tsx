import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  color?: string;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  color = '#3b82f6',
  badge,
}) => {
  return (
    <div
      style={{
        background: '#121929',
        border: '1px solid #1c2638',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        minHeight: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
        {icon && (
          <div
            style={{
              color,
              background: `${color}18`,
              borderRadius: 6,
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.5px' }}>
          {value}
        </div>
        {(subtext || badge) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: `${color}20`,
                  color,
                }}
              >
                {badge}
              </span>
            )}
            {subtext && <span style={{ fontSize: 12, color: '#64748b' }}>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
