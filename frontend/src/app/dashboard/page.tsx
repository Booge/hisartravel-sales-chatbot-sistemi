'use client';

import { useState, useEffect } from 'react';
import { analyticsAPI } from '@/lib/api';
import {
  Users, MessageSquare, Target, Zap, Phone, Globe, TrendingUp, Bot
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await analyticsAPI.dashboard();
      setData(res.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  const stats = data?.summary || {};
  const whatsapp = data?.whatsappStatus || {};

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Hisar Travel ChatBot genel görünüm</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Toplam Kişi</span>
            <div className="stat-icon purple">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.totalContacts || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Aktif Konuşma</span>
            <div className="stat-icon teal">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.activeConversations || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Bugünkü Mesajlar</span>
            <div className="stat-icon green">
              <Zap size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.todayMessages || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">AI Token (Aylık)</span>
            <div className="stat-icon orange">
              <Bot size={20} />
            </div>
          </div>
          <div className="stat-value">
            {stats.monthlyTokens ? `${(stats.monthlyTokens / 1000).toFixed(1)}K` : '0'}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Lead Pipeline Summary */}
        <div className="card">
          <div className="card-header">
            <h3>📊 Lead Pipeline</h3>
          </div>
          <div className="card-body">
            {data?.leadsByStage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(data.leadsByStage).map(([stage, count]: [string, any]) => {
                  const stageLabels: Record<string, string> = {
                    NEW: '🆕 Yeni',
                    CONTACTED: '📞 İletişime Geçildi',
                    QUALIFIED: '✅ Nitelikli',
                    PROPOSAL: '📋 Teklif',
                    NEGOTIATION: '🤝 Müzakere',
                    WON: '🏆 Kazanıldı',
                    LOST: '❌ Kaybedildi',
                  };
                  const colors: Record<string, string> = {
                    NEW: '#74b9ff', CONTACTED: '#a78bfa', QUALIFIED: '#00cec9',
                    PROPOSAL: '#fdcb6e', NEGOTIATION: '#fd79a8', WON: '#00b894', LOST: '#e17055',
                  };
                  const total = Object.values(data.leadsByStage).reduce((a: number, b: any) => a + b, 0) as number;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '160px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {stageLabels[stage] || stage}
                      </span>
                      <div style={{ flex: 1, height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: '4px',
                          background: colors[stage] || '#6c5ce7', transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', width: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>Henüz lead yok</p>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp & System Status */}
        <div className="card">
          <div className="card-header">
            <h3>⚡ Sistem Durumu</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* WhatsApp Status */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={18} style={{ color: '#25d366' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>WhatsApp</span>
                </div>
                <div className={`whatsapp-status ${whatsapp.connected ? 'connected' : 'disconnected'}`}>
                  <span className="dot" />
                  {whatsapp.connected ? 'Bağlı' : whatsapp.enabled ? 'Bağlantı Bekleniyor' : 'Devre Dışı'}
                </div>
              </div>

              {/* Web Chat Status */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Web Chat</span>
                </div>
                <div className="whatsapp-status connected">
                  <span className="dot" />
                  Aktif
                </div>
              </div>

              {/* AI Engine Status */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bot size={18} style={{ color: 'var(--accent-secondary)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>AI Engine</span>
                </div>
                <div className="whatsapp-status connected">
                  <span className="dot" />
                  OpenAI Bağlı
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px'
              }}>
                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.totalConversations || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Toplam Konuşma</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.totalMessages || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Toplam Mesaj</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="card">
        <div className="card-header">
          <h3>💬 Son Konuşmalar</h3>
        </div>
        <div className="conversation-list">
          {data?.recentConversations?.length > 0 ? (
            data.recentConversations.map((conv: any) => (
              <div className="conversation-item" key={conv.id}>
                <div className={`conversation-avatar ${conv.channel?.toLowerCase()}`}>
                  {conv.channel === 'WHATSAPP' ? '📱' : '🌐'}
                </div>
                <div className="conversation-info">
                  <div className="name">{conv.contact?.name || conv.contact?.phone || 'Bilinmeyen'}</div>
                  <div className="last-message">
                    {conv.messages?.[0]?.content?.substring(0, 60) || 'Mesaj yok'}
                  </div>
                </div>
                <div className="conversation-meta">
                  <div className="time">
                    {new Date(conv.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <span className={`channel-badge ${conv.channel?.toLowerCase()}`}>
                      {conv.channel === 'WHATSAPP' ? 'WhatsApp' : 'Web'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="icon">💬</div>
              <h3>Henüz konuşma yok</h3>
              <p>Müşteriler WhatsApp veya web üzerinden yazdığında burada görünecek</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
