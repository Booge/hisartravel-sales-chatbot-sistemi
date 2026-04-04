'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessageSquare, Users, Target, BarChart3,
  Settings, LogOut, Phone, Globe, Bell
} from 'lucide-react';

const NAV_ITEMS = [
  { section: 'GENEL', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/conversations', label: 'Konuşmalar', icon: MessageSquare, badge: true },
  ]},
  { section: 'CRM', items: [
    { href: '/dashboard/contacts', label: 'Kişiler', icon: Users },
    { href: '/dashboard/leads', label: 'Satış Pipeline', icon: Target },
  ]},
  { section: 'ANALİTİK', items: [
    { href: '/dashboard/analytics', label: 'Raporlar', icon: BarChart3 },
  ]},
  { section: 'SİSTEM', items: [
    { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="loading-spinner" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🤖 Hisar ChatBot</h2>
          <div className="subtitle">Sales Dashboard</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => (
                <button
                  key={item.href}
                  className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                  onClick={() => router.push(item.href)}
                >
                  <item.icon className="icon" size={20} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="name">{user.name}</div>
              <div className="role">{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}
              title="Çıkış Yap"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
