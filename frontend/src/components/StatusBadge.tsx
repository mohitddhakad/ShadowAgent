import React from 'react';

export const AgentBadge: React.FC<{ agent: string }> = ({ agent }) => {
  const isRed = agent.toLowerCase().includes('red');
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: isRed ? '#2d1216' : '#0b261d',
        color: isRed ? '#f87171' : '#34d399',
        border: `1px solid ${isRed ? '#7f1d1d' : '#065f46'}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isRed ? '#ef4444' : '#10b981',
        }}
      />
      {agent}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const s = severity.toLowerCase();
  let bg = '#1e293b';
  let color = '#94a3b8';
  let border = '#334155';

  if (s === 'critical') {
    bg = '#3b1016';
    color = '#f87171';
    border = '#991b1b';
  } else if (s === 'high') {
    bg = '#361b0c';
    color = '#fb923c';
    border = '#9a3412';
  } else if (s === 'medium') {
    bg = '#2e240a';
    color = '#fbbf24';
    border = '#854d0e';
  } else if (s === 'low') {
    bg = '#0d2818';
    color = '#4ade80';
    border = '#166534';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {severity}
    </span>
  );
};

export const NodeStatusBadge: React.FC<{ status?: string }> = ({ status = 'clean' }) => {
  const s = status.toLowerCase();
  let bg = '#0f1f1a';
  let color = '#10b981';
  let border = '#065f46';
  let label = 'Clean';

  if (s === 'compromised') {
    bg = '#3b1016';
    color = '#ef4444';
    border = '#991b1b';
    label = 'Compromised';
  } else if (s === 'isolated') {
    bg = '#0c2438';
    color = '#06b6d4';
    border = '#0e7490';
    label = 'Isolated';
  } else if (s === 'honeypot_hit') {
    bg = '#332709';
    color = '#f59e0b';
    border = '#b45309';
    label = 'Honeypot Triggered';
  } else if (s === 'suspicious') {
    bg = '#331d0b';
    color = '#f97316';
    border = '#c2410c';
    label = 'Suspicious';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
};
