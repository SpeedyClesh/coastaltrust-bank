import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { Bell, Search, Menu, X, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './Layout.css';

export default function Layout() {
  const { user, unreadCount, notifications, fetchNotifications, markNotificationRead, markAllRead } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifIcon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  return (
    <div className="layout">
      {mobileSidebar && <div className="mobile-overlay" onClick={() => setMobileSidebar(false)}/>}
      <div className={`sidebar-wrapper ${mobileSidebar ? 'mobile-open' : ''}`}>
        <Sidebar/>
      </div>

      <div className="layout-main">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileSidebar(true)}>
            <Menu size={20}/>
          </button>

          <div className="topbar-center">
            <div className="topbar-search">
              <Search size={16} className="search-icon"/>
              <input type="text" placeholder="Search transactions, accounts..." readOnly onClick={() => navigate('/transactions')}/>
            </div>
          </div>

          <div className="topbar-right">
            <div className="notif-wrapper" ref={notifRef}>
              <button className="notif-btn" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell size={20}/>
                {unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="mark-all-btn">
                        <CheckCheck size={14}/> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Bell size={32}/><p>No notifications</p>
                      </div>
                    ) : notifications.slice(0, 15).map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                        onClick={() => { markNotificationRead(n.id); setShowNotifications(false); }}
                      >
                        <span className="notif-icon">{notifIcon[n.type] || 'ℹ️'}</span>
                        <div className="notif-content">
                          <p className="notif-title">{n.title}</p>
                          <p className="notif-msg">{n.message}</p>
                          <p className="notif-time">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                        </div>
                        {!n.is_read && <span className="notif-dot"/>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-user" onClick={() => navigate('/profile')}>
              <div className="topbar-avatar">
                {user?.profileImage
                  ? <img src={`http://localhost:5000${user.profileImage}`} alt=""/>
                  : <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                }
              </div>
              <div className="topbar-user-info hide-mobile">
                <p className="topbar-name">{user?.firstName} {user?.lastName}</p>
                <p className="topbar-role">{user?.role === 'admin' ? 'Administrator' : 'Account Holder'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="layout-content">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
