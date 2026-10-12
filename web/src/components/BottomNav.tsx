import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Flame, Moon, Brain, History } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { to: '/home', label: 'Today', icon: Activity },
    { to: '/workout', label: 'Workout', icon: Flame },
    { to: '/recovery', label: 'Recovery', icon: Moon },
    { to: '/insights', label: 'Logic', icon: Brain },
    { to: '/history', label: 'History', icon: History },
  ];

  return (
    <nav className="mobile-bottom-nav" style={{
      display: 'none',
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(11, 14, 23, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0.4rem 0.5rem calc(0.4rem + env(safe-area-inset-bottom, 0px))',
      zIndex: 100,
      justifyContent: 'space-around',
    }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.to || (item.to !== '/home' && location.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.2rem',
              padding: '0.4rem 0.6rem',
              textDecoration: 'none',
              color: active ? 'var(--brand-400)' : 'var(--text-3)',
              fontSize: '0.7rem',
              fontWeight: active ? 600 : 400,
            }}
          >
            <Icon size={20} color={active ? 'var(--brand-400)' : 'currentColor'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
