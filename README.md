# 🤖 Hisar Travel — Sales Agent ChatBot

AI destekli, WhatsApp + Web üzerinden çalışan satış asistanı chatbot sistemi.

## Özellikler

- 🤖 **AI Chat Engine** — OpenAI GPT entegrasyonu (akıllı model seçimi + görsel analiz)
- 📱 **WhatsApp Entegrasyonu** — whatsapp-web.js ile otomatik mesaj yanıtlama
- 🌐 **Web Dashboard** — Modern, dark tema admin paneli
- 📊 **CRM & Lead Yönetimi** — Kanban pipeline, otomatik lead skorlama
- 📈 **Analitik & Raporlama** — Konuşma analitiği, duygu analizi
- 🔐 **Auth & Rol Yönetimi** — JWT, Admin/Manager/Agent rolleri
- 📎 **Dosya/Resim Desteği** — Müşteri görselleri AI ile analiz
- 📚 **Bilgi Tabanı** — Özelleştirilebilir bot prompt ve KB

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | Next.js 14 + React |
| Veritabanı | PostgreSQL + Prisma ORM |
| Cache | Redis |
| AI | OpenAI GPT-5.4 |
| WhatsApp | whatsapp-web.js |
| Gerçek Zamanlı | Socket.IO |
| Deploy | Docker + Coolify |

## Hızlı Başlangıç

```bash
# 1. Repo'yu klonla
git clone https://github.com/Booge/hisartravel-sales-chatbot-sistemi.git
cd hisartravel-sales-chatbot-sistemi

# 2. .env dosyasını kopyala ve düzenle
cp .env.example .env
# OPENAI_API_KEY değerini gir

# 3. Docker ile başlat
docker compose up -d

# 4. Veritabanını hazırla
cd backend && npm run db:migrate && npm run db:seed

# 5. http://localhost:3000 adresinden dashboard'a eriş
# Varsayılan: admin@hisartravel.com / admin123
```

## Proje Yapısı

```
├── backend/          # Express API + WhatsApp + AI
├── frontend/         # Next.js Dashboard
├── docs/             # Dokümantasyon & Planlar
├── docker-compose.yml
└── .env.example
```

## Dokümantasyon

- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Lisans

Private — Hisar Travel
