import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, TrendingDown, TrendingUp,
  CreditCard, BookOpen, User, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, Shield, Users, BarChart3,
  Settings, Inbox, Activity
} from 'lucide-react';
import './Sidebar.css';

const userNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transfer', icon: ArrowLeftRight, label: 'Transfer' },
  { to: '/deposit', icon: TrendingUp, label: 'Deposit' },
  { to: '/withdraw', icon: TrendingDown, label: 'Withdraw' },
  { to: '/transactions', icon: Activity, label: 'Transactions' },
  { to: '/loans', icon: BookOpen, label: 'Loans' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/beneficiaries', icon: Users, label: 'Beneficiaries' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/support', icon: HelpCircle, label: 'Support' },
];

const adminNavItems = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/transactions', icon: Activity, label: 'Transactions' },
  { to: '/admin/loans', icon: BookOpen, label: 'Loans' },
  { to: '/admin/tickets', icon: Inbox, label: 'Support Tickets' },
  { to: '/admin/audit', icon: Shield, label: 'Audit Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout, unreadCount } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const navItems = user && user.role === 'admin' ? adminNavItems : userNavItems;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">⚓</span>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-name">CoastalTrust</span>
              <span className="logo-sub">PRIVATE BANKING</span>
            </div>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && user && (
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.profileImage
              ? <img src={`http://localhost:5000${user.profileImage}`} alt="avatar" />
              : <span>{user.firstName && user.firstName[0]}{user.lastName && user.lastName[0]}</span>
            }
          </div>
          <div className="user-info">
            <p className="user-name">{user.firstName} {user.lastName}</p>
            <p className="user-role">{user.role === 'admin' ? 'Administrator' : `Acc: ${user.accountNumber}`}</p>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon">
              <Icon size={18} />
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </div>
            {!collapsed && <span className="nav-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="account-status">
            <span className={`status-dot ${user.status === 'active' ? 'active' : 'pending'}`} />
            <span>{user.status === 'active' ? 'Account Active' : 'Pending Verification'}</span>
          </div>
        )}
        <button
          className="nav-item logout-btn"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <div className="nav-icon"><LogOut size={18} /></div>
          {!collapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
