'use client';

import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import { Send, Paperclip, Phone, Globe, Search } from 'lucide-react';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await chatAPI.getConversations({ search });
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await chatAPI.getMessages(convId);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;

    try {
      await chatAPI.sendMessage(selectedConv.id, {
        content: newMessage,
        sender: 'AGENT',
      });
      setNewMessage('');
      loadMessages(selectedConv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', gap: '0', height: 'calc(100vh - 48px)', margin: '-24px', marginTop: '-24px' }}>
      {/* Conversation List */}
      <div style={{
        width: '360px', borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Konuşmalar</h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)'
          }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadConversations()}
              style={{
                flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)',
                fontSize: '13px', outline: 'none'
              }}
            />
          </div>
        </div>

        <div className="conversation-list" style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConv?.id === conv.id ? 'active' : ''}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div className={`conversation-avatar ${conv.channel?.toLowerCase()}`}>
                  {conv.channel === 'WHATSAPP' ? <Phone size={18} /> : <Globe size={18} />}
                </div>
                <div className="conversation-info">
                  <div className="name">{conv.contact?.name || conv.contact?.phone || 'Bilinmeyen'}</div>
                  <div className="last-message">
                    {conv.messages?.[0]?.content?.substring(0, 40) || '...'}
                  </div>
                </div>
                <div className="conversation-meta">
                  <div className="time">{formatTime(conv.updatedAt)}</div>
                  {conv._count?.messages > 0 && (
                    <div className="unread">{conv._count.messages}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="icon">💬</div>
              <h3>Konuşma yok</h3>
              <p>Henüz aktif konuşma bulunmuyor</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className={`conversation-avatar ${selectedConv.channel?.toLowerCase()}`} style={{ width: 36, height: 36, fontSize: 14 }}>
                {selectedConv.channel === 'WHATSAPP' ? <Phone size={16} /> : <Globe size={16} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {selectedConv.contact?.name || selectedConv.contact?.phone || 'Bilinmeyen'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedConv.channel === 'WHATSAPP' ? `📱 ${selectedConv.contact?.phone}` : '🌐 Web Chat'}
                  {' • '}
                  <span className={`status-badge ${selectedConv.contact?.status?.toLowerCase()}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {selectedConv.contact?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.sender?.toLowerCase()}`}>
                  <div className="sender-name">
                    {msg.sender === 'CONTACT' ? '👤 Müşteri' : msg.sender === 'BOT' ? '🤖 Bot' : '👨‍💼 Agent'}
                  </div>
                  {msg.type === 'IMAGE' && msg.mediaUrl && (
                    <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${msg.mediaUrl}`} alt="media" />
                  )}
                  {msg.content && <div>{msg.content}</div>}
                  <div className="time">
                    {formatTime(msg.createdAt)}
                    {msg.aiModel && <span style={{ marginLeft: '8px', opacity: 0.6 }}>({msg.aiModel})</span>}
                  </div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <div className="chat-input-wrapper">
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}>
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Mesaj yaz... (Agent olarak)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className="chat-send-btn" onClick={handleSend}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
            <h3>Bir konuşma seçin</h3>
            <p>Sol taraftan bir konuşma seçerek mesajları görüntüleyebilirsiniz</p>
          </div>
        )}
      </div>
    </div>
  );
}
