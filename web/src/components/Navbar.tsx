import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Flame, Moon, Brain, History, RefreshCw, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/home', label: 'Today', icon: Activity },
    { to: '/workout', label: 'Workout', icon: Flame },
    { to: '/recovery', label: 'Recovery', icon: Moon },
    { to: '/insights', label: 'Insights & Logic', icon: Brain },
    { to: '/history', label: 'History', icon: History },
    { to: '/sync', label: 'HealthKit Sync', icon: RefreshCw },
  ];

  return (
    <header className="navbar-header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      background: 'rgba(11, 14, 23, 0.85)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div className="flex items-center gap-6">
        <Link to="/home" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--brand-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(20, 184, 166, 0.3)'
          }}>
            <Activity size={20} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
              AURA
            </span>
            <span style={{
              marginLeft: '0.4rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-400)',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              FUZZY INTEL
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav flex items-center gap-1" style={{ display: 'flex' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to !== '/home' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#fff' : 'var(--text-2)',
                  background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                  border: active ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                }}
              >
                <Icon size={16} color={active ? 'var(--brand-400)' : 'currentColor'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right User & Status */}
      <div className="flex items-center gap-3">
        <Link
          to="/checkin"
          className="btn btn-sm btn-outline"
          style={{
            borderColor: 'rgba(99, 102, 241, 0.4)',
            color: 'var(--brand-300)',
            fontSize: '0.8rem',
            padding: '0.4rem 0.8rem'
          }}
        >
          Check-In
        </Link>

        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-color)',
            textDecoration: 'none',
            color: 'var(--text-1)',
            fontSize: '0.85rem'
          }}
        >
          <div style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--brand-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
          </div>
          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
          </span>
        </Link>

        <button
          onClick={logout}
          className="btn btn-ghost btn-icon"
          title="Sign Out"
          style={{ padding: '0.4rem' }}
        >
          <LogOut size={16} color="var(--text-3)" />
        </button>
      </div>
    </header>
  );
}
