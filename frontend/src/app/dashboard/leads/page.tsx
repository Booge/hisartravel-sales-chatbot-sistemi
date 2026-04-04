'use client';

import { useState, useEffect } from 'react';
import { leadsAPI } from '@/lib/api';

const STAGE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  NEW: { label: 'Yeni', emoji: '🆕', color: '#74b9ff' },
  CONTACTED: { label: 'İletişim', emoji: '📞', color: '#a78bfa' },
  QUALIFIED: { label: 'Nitelikli', emoji: '✅', color: '#00cec9' },
  PROPOSAL: { label: 'Teklif', emoji: '📋', color: '#fdcb6e' },
  NEGOTIATION: { label: 'Müzakere', emoji: '🤝', color: '#fd79a8' },
  WON: { label: 'Kazanıldı', emoji: '🏆', color: '#00b894' },
  LOST: { label: 'Kaybedildi', emoji: '❌', color: '#e17055' },
};

export default function LeadsPage() {
  const [pipeline, setPipeline] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPipeline(); }, []);

  const loadPipeline = async () => {
    try {
      const res = await leadsAPI.getPipeline();
      setPipeline(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#00b894';
    if (score >= 40) return '#fdcb6e';
    return '#e17055';
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Satış Pipeline</h1>
        <p>Lead'leri takip edin ve satışlarınızı yönetin</p>
      </div>

      <div className="pipeline-board">
        {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
          const leads = pipeline[stage] || [];
          return (
            <div className="pipeline-column" key={stage}>
              <div className="pipeline-column-header" style={{ borderTop: `3px solid ${config.color}` }}>
                <h4>{config.emoji} {config.label}</h4>
                <span className="count">{leads.length}</span>
              </div>
              <div className="pipeline-cards">
                {leads.length > 0 ? leads.map((lead) => (
                  <div className="pipeline-card" key={lead.id}>
                    <div className="lead-name">
                      {lead.contact?.name || 'İsimsiz'}
                    </div>
                    <div className="lead-info">
                      📱 {lead.contact?.phone || 'Telefon yok'}
                    </div>
                    {lead.title && (
                      <div className="lead-info" style={{ marginTop: '4px' }}>
                        📝 {lead.title}
                      </div>
                    )}
                    {lead.value && (
                      <div className="lead-info" style={{ marginTop: '4px', color: 'var(--status-success)' }}>
                        💰 {lead.value.toLocaleString('tr-TR')} {lead.currency}
                      </div>
                    )}
                    <div className="lead-score">
                      <div className="score-bar">
                        <div
                          className="fill"
                          style={{
                            width: `${lead.score}%`,
                            background: getScoreColor(lead.score)
                          }}
                        />
                      </div>
                      <span className="score-value">{Math.round(lead.score)}%</span>
                    </div>
                    {lead.assignee && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        👤 {lead.assignee.name}
                      </div>
                    )}
                  </div>
                )) : (
                  <div style={{
                    padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)'
                  }}>
                    Boş
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
