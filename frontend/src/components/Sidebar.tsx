import React from 'react';
import {
  LayoutDashboard,
  Network,
  PlayCircle,
  ListOrdered,
  History,
  BarChart3,
  Settings,
  Shield,
  Scale,
  BrainCircuit,
} from 'lucide-react';
import type { ViewTab } from '../types';

interface SidebarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  eventCount?: number;
  runsCount?: number;
}

interface NavItem {
  id: ViewTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  eventCount = 0,
  runsCount = 0,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'network',
      label: 'Network Topology',
      icon: <Network size={18} />,
    },
    {
      id: 'simulation',
      label: 'Simulation Lab',
      icon: <PlayCircle size={18} />,
    },
    {
      id: 'comparison',
      label: 'Defense Comparison',
      icon: <Scale size={18} />,
    },
    {
      id: 'rl',
      label: 'RL Defense Lab',
      icon: <BrainCircuit size={18} />,
    },
    {
      id: 'timeline',
      label: 'Event Timeline',
      icon: <ListOrdered size={18} />,
      badge: eventCount > 0 ? eventCount : undefined,
    },
    {
      id: 'history',
      label: 'Run History',
      icon: <History size={18} />,
      badge: runsCount > 0 ? runsCount : undefined,
    },
    {
      id: 'analytics',
      label: 'Security Analytics',
      icon: <BarChart3 size={18} />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
    },
  ];

  return (
    <aside
      style={{
        width: 240,
        height: '100%',
        background: '#0d121f',
        borderRight: '1px solid #1c2638',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid #1c2638',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            borderRadius: 8,
            padding: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#070a12',
          }}
        >
          <Shield size={20} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            ShadowAgent
          </div>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Security Sandbox
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ padding: '16px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: 'none',
                background: isActive ? '#1c2638' : 'transparent',
                color: isActive ? '#f8fafc' : '#94a3b8',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: 'background 0.15s ease, color 0.15s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: isActive ? '#10b981' : '#64748b' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: isActive ? '#10b98125' : '#1c2638',
                    color: isActive ? '#10b981' : '#94a3b8',
                    border: `1px solid ${isActive ? '#10b98150' : '#2a3852'}`,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sandbox Footer Disclaimer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid #1c2638',
          fontSize: 11,
          color: '#64748b',
          lineHeight: '1.4',
        }}
      >
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginRight: 6 }} />
        Isolated Educational Env
      </div>
    </aside>
  );
};
