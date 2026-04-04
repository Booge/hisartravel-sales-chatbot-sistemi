'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [botConfig, setBotConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKb, setNewKb] = useState({ title: '', content: '', category: '' });
  const [showKbForm, setShowKbForm] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await settingsAPI.getBot();
      setBotConfig(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateBot(botConfig);
      alert('✅ Bot ayarları kaydedildi!');
    } catch (err) { alert('❌ Kaydetme hatası'); }
    finally { setSaving(false); }
  };

  const handleAddKb = async () => {
    try {
      await settingsAPI.addKnowledge(newKb);
      setNewKb({ title: '', content: '', category: '' });
      setShowKbForm(false);
      loadConfig();
    } catch (err) { alert('❌ Ekleme hatası'); }
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm('Bu bilgi kaydını silmek istiyor musunuz?')) return;
    try {
      await settingsAPI.deleteKnowledge(id);
      loadConfig();
    } catch (err) { alert('❌ Silme hatası'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Ayarlar</h1>
        <p>Bot yapılandırması ve bilgi tabanı yönetimi</p>
      </div>

      <div className="content-grid">
        {/* Bot Configuration */}
        <div className="card">
          <div className="card-header">
            <h3>🤖 Bot Ayarları</h3>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Bot İsmi</label>
              <input
                className="form-input"
                value={botConfig?.name || ''}
                onChange={(e) => setBotConfig({ ...botConfig, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Karşılama Mesajı</label>
              <input
                className="form-input"
                value={botConfig?.welcomeMessage || ''}
                onChange={(e) => setBotConfig({ ...botConfig, welcomeMessage: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                className="form-input"
                value={botConfig?.model || 'gpt-5.4-mini'}
                onChange={(e) => setBotConfig({ ...botConfig, model: e.target.value })}
              >
                <option value="gpt-5.4-nano">GPT-5.4 Nano (Hızlı, Ucuz)</option>
                <option value="gpt-5.4-mini">GPT-5.4 Mini (Dengeli)</option>
                <option value="gpt-5.4">GPT-5.4 (Güçlü)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Temperature ({botConfig?.temperature || 0.7})</label>
                <input
                  type="range" min="0" max="2" step="0.1"
                  value={botConfig?.temperature || 0.7}
                  onChange={(e) => setBotConfig({ ...botConfig, temperature: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label>Max Tokens</label>
                <input
                  type="number" className="form-input"
                  value={botConfig?.maxTokens || 1024}
                  onChange={(e) => setBotConfig({ ...botConfig, maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>System Prompt</label>
              <textarea
                className="form-input"
                rows={10}
                value={botConfig?.systemPrompt || ''}
                onChange={(e) => setBotConfig({ ...botConfig, systemPrompt: e.target.value })}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="card">
          <div className="card-header">
            <h3>📚 Bilgi Tabanı</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowKbForm(!showKbForm)}>
              <Plus size={14} /> Ekle
            </button>
          </div>
          <div className="card-body">
            {showKbForm && (
              <div style={{
                padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                marginBottom: '16px', border: '1px solid var(--border-color)'
              }}>
                <div className="form-group">
                  <label>Başlık</label>
                  <input className="form-input" value={newKb.title} onChange={(e) => setNewKb({ ...newKb, title: e.target.value })} placeholder="Örn: Umrah Paketleri" />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <input className="form-input" value={newKb.category} onChange={(e) => setNewKb({ ...newKb, category: e.target.value })} placeholder="Örn: Ürünler" />
                </div>
                <div className="form-group">
                  <label>İçerik</label>
                  <textarea className="form-input" rows={5} value={newKb.content} onChange={(e) => setNewKb({ ...newKb, content: e.target.value })} placeholder="Bot'un bilmesi gereken bilgileri yazın..." style={{ resize: 'vertical' }} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddKb}>Ekle</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {botConfig?.knowledgeBase?.map((kb: any) => (
                <div key={kb.id} style={{
                  padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{kb.title}</span>
                    <button onClick={() => handleDeleteKb(kb.id)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {kb.category && <span className="status-badge lead" style={{ marginBottom: '6px' }}>{kb.category}</span>}
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden' }}>
                    {kb.content.substring(0, 200)}...
                  </p>
                </div>
              ))}
              {!botConfig?.knowledgeBase?.length && (
                <div className="empty-state"><p>Henüz bilgi tabanı eklenmemiş</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
