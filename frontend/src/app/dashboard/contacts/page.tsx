'use client';

import { useState, useEffect } from 'react';
import { contactsAPI } from '@/lib/api';
import { Search, Phone, Mail, MessageSquare } from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadContacts(); }, [statusFilter]);

  const loadContacts = async () => {
    try {
      const res = await contactsAPI.getAll({ search, status: statusFilter || undefined });
      setContacts(res.data.contacts || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Kişiler</h1>
        <p>Tüm müşteri ve lead kişileri yönetin</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', flex: '1',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)'
        }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="İsim, telefon veya email ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadContacts()}
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
          />
        </div>
        {['', 'LEAD', 'PROSPECT', 'CUSTOMER', 'LOST'].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(s)}
            style={{ fontSize: '12px' }}
          >
            {s === '' ? 'Tümü' : s === 'LEAD' ? '🆕 Lead' : s === 'PROSPECT' ? '🔍 Prospect' : s === 'CUSTOMER' ? '✅ Müşteri' : '❌ Kayıp'}
          </button>
        ))}
      </div>

      {/* Contacts Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kişi</th>
              <th>Telefon</th>
              <th>Email</th>
              <th>Durum</th>
              <th>Kaynak</th>
              <th>Konuşma</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length > 0 ? contacts.map((contact) => (
              <tr key={contact.id}>
                <td style={{ fontWeight: 600 }}>{contact.name || 'İsimsiz'}</td>
                <td>
                  {contact.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Phone size={14} /> {contact.phone}
                    </span>
                  )}
                </td>
                <td>
                  {contact.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Mail size={14} /> {contact.email}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${contact.status?.toLowerCase()}`}>
                    {contact.status}
                  </span>
                </td>
                <td>
                  <span className={`channel-badge ${contact.source}`}>
                    {contact.source === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web'}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <MessageSquare size={14} /> {contact._count?.conversations || 0}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {new Date(contact.createdAt).toLocaleDateString('tr-TR')}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <h3>Kişi bulunamadı</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
