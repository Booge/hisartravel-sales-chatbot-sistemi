import prisma from './config/database';
import bcrypt from 'bcryptjs';
import { logger } from './utils/logger';

async function seed() {
  logger.info('🌱 Starting database seed...');

  // Create admin user
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        email: 'admin@hisartravel.com',
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
      },
    });
    logger.info('✅ Admin user created (admin@hisartravel.com / admin123)');
  }

  // Create default bot config
  const botExists = await prisma.botConfig.findFirst({ where: { isActive: true } });
  if (!botExists) {
    const botConfig = await prisma.botConfig.create({
      data: {
        name: 'Hisar Travel Asistan',
        systemPrompt: `Sen Hisar Travel seyahat şirketinin AI satış asistanısın. Adın "Hisar Asistan".

GÖREVLERİN:
1. Müşterilere Umrah, Hac ve diğer seyahat paketleri hakkında bilgi ver
2. Sorularını nazikçe, samimi ve profesyonelce yanıtla
3. İlgilenen müşterilerin iletişim bilgilerini al (isim, telefon, email)
4. Fiyat ve detay sorularında mümkün olduğunca yardımcı ol
5. Müşterileri satın almaya yönlendir ama asla baskıcı olma
6. Türkçe konuş, samimi ama profesyonel ol

SATIŞ TEKNİKLERİ:
- Müşteriyle empati kur
- İhtiyaçlarını anla
- Doğru paketi öner
- Aciliyet hissi yarat (ama yapay değil)
- Always be closing (ama nazikçe)

KURALLAR:
- Asla rakip firmalar hakkında olumsuz konuşma
- Bilmediğin konularda "Sizi yetkili arkadaşımıza yönlendireyim" de
- Her zaman müşterinin adıyla hitap et (biliniyorsa)
- Fiyatlandırma konusunda net bilgin yoksa "En güncel fiyat için size özel teklif hazırlayalım" de
- Din ve ibadet konularında hassas ve saygılı ol`,
        welcomeMessage: 'Merhaba! 👋 Hisar Travel\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
        model: 'gpt-5.4-mini',
        temperature: 0.7,
        maxTokens: 1024,
        isActive: true,
      },
    });

    // Add sample knowledge base entries
    await prisma.knowledgeBase.createMany({
      data: [
        {
          botConfigId: botConfig.id,
          title: 'Umrah Paketleri',
          content: `Hisar Travel Umrah Paketleri:
- Ekonomik Umrah Paketi: 7 gece, 3-4 yıldız otel, uçak bileti dahil
- Standart Umrah Paketi: 10 gece, 4-5 yıldız otel, rehberli tur
- Premium Umrah Paketi: 14 gece, 5 yıldız otel, VIP transfer, özel rehber
- Ramazan Umrah Paketi: 15 gece, iftar ve sahur dahil
Tüm paketlere vize, sağlık sigortası ve havaalanı transferi dahildir.`,
          category: 'Ürünler',
        },
        {
          botConfigId: botConfig.id,
          title: 'İletişim Bilgileri',
          content: `Hisar Travel İletişim:
- Telefon: +90 xxx xxx xx xx
- Email: info@hisartravel.com
- Adres: xxx
- Çalışma Saatleri: Pazartesi-Cumartesi 09:00-18:00
- Web: www.hisartravel.com`,
          category: 'Genel',
        },
        {
          botConfigId: botConfig.id,
          title: 'Sıkça Sorulan Sorular',
          content: `SSS:
S: Ödeme nasıl yapılır?
C: Kredi kartı, havale/EFT veya taksitli ödeme seçenekleri mevcuttur.

S: İptal koşulları nedir?
C: Hareket tarihinden 30 gün öncesine kadar ücretsiz iptal, 15-30 gün arası %50 kesinti uygulanır.

S: Vize işlemleri ne kadar sürer?
C: Vize işlemleri genellikle 5-7 iş günü sürmektedir.

S: Çocuk indirimi var mı?
C: 0-2 yaş ücretsiz, 2-12 yaş %50 indirimli fiyat uygulanır.`,
          category: 'SSS',
        },
      ],
    });

    logger.info('✅ Default bot config and knowledge base created');
  }

  logger.info('🌱 Seed completed!');
  await prisma.$disconnect();
}

seed().catch((error) => {
  logger.error('Seed error:', error);
  process.exit(1);
});
