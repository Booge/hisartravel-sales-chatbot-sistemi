'use client';

export default function AnalyticsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Raporlar & Analitik</h1>
        <p>Chatbot performansı ve satış analitiği</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Dönüşüm Oranı</span>
          </div>
          <div className="stat-value">--%</div>
          <div className="stat-change">Lead → Müşteri</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Ort. Yanıt Süresi</span>
          </div>
          <div className="stat-value">--s</div>
          <div className="stat-change">AI bot yanıt süresi</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Müşteri Memnuniyeti</span>
          </div>
          <div className="stat-value">--%</div>
          <div className="stat-change">Duygu analizi bazlı</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">AI Maliyet (Aylık)</span>
          </div>
          <div className="stat-value">$--</div>
          <div className="stat-change">OpenAI token kullanımı</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>📊 Detaylı Raporlar</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <div className="icon">📈</div>
            <h3>Raporlar yakında aktif olacak</h3>
            <p>Yeterli veri toplandığında detaylı grafikler ve raporlar burada görünecek</p>
          </div>
        </div>
      </div>
    </div>
  );
}
