import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface AIResponse {
  content: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  metadata: {
    intentDetected?: string;
    sentiment?: string;
    leadScore?: number;
  };
}

export class AIService {
  /**
   * Get AI response for a conversation
   */
  async chat(
    conversationId: string,
    userMessage: string,
    imageUrl?: string
  ): Promise<AIResponse> {
    // Get bot config
    const botConfig = await prisma.botConfig.findFirst({
      where: { isActive: true },
      include: { knowledgeBase: { where: { isActive: true } } },
    });

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(botConfig);

    // Get conversation history
    const history = await this.getConversationHistory(conversationId);

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // Add current message (with image if present)
    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userMessage || 'Bu resmi analiz et.' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    // Select model based on complexity
    const model = imageUrl
      ? env.OPENAI_VISION_MODEL
      : this.selectModel(userMessage, history.length);

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: messages as any,
        temperature: botConfig?.temperature || 0.7,
        max_tokens: botConfig?.maxTokens || 1024,
      });

      const choice = response.choices[0];
      const content = choice.message?.content || 'Üzgünüm, yanıt oluşturamadım.';

      // Analyze intent and sentiment
      const metadata = await this.analyzeMessage(userMessage, content);

      return {
        content,
        model,
        tokens: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
        metadata,
      };
    } catch (error: any) {
      logger.error('AI chat error:', error);
      throw new Error(`AI yanıt hatası: ${error.message}`);
    }
  }

  /**
   * Analyze image and return description
   */
  async analyzeImage(imageUrl: string, prompt?: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: env.OPENAI_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || 'Bu resmi detaylı bir şekilde analiz et ve açıkla.',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
      });

      return response.choices[0].message?.content || 'Resim analiz edilemedi.';
    } catch (error: any) {
      logger.error('Image analysis error:', error);
      throw new Error('Resim analiz edilemedi');
    }
  }

  /**
   * Build system prompt with knowledge base
   */
  private buildSystemPrompt(botConfig: any): string {
    const defaultPrompt = `Sen ${env.BOT_NAME} adlı bir satış asistanısın. Hisar Travel seyahat şirketi için çalışıyorsun.

GÖREVLERİN:
- Müşterilere seyahat paketleri hakkında bilgi ver
- Sorularını nazikçe ve profesyonelce yanıtla
- İlgilenen müşterilerin iletişim bilgilerini al (isim, telefon, email)
- Fiyat ve detay sorularında mümkün olduğunca yardımcı ol
- Müşterileri satın almaya yönlendir ama baskıcı olma
- Türkçe konuş, samimi ama profesyonel ol

KURALLAR:
- Asla rakip firmalar hakkında olumsuz konuşma
- Bilmediğin konularda "Sizi yetkili arkadaşımıza yönlendireyim" de
- Her zaman müşterinin adıyla hitap et (biliniyorsa)
- Fiyatlandırma konusunda net bilgin yoksa "En güncel fiyat için size özel teklif hazırlayalım" de`;

    let prompt = botConfig?.systemPrompt || defaultPrompt;

    // Append knowledge base
    if (botConfig?.knowledgeBase?.length > 0) {
      prompt += '\n\n--- BİLGİ TABANI ---\n';
      for (const kb of botConfig.knowledgeBase) {
        prompt += `\n[${kb.title}]\n${kb.content}\n`;
      }
    }

    // Add current date/time context
    prompt += `\n\nBugünün tarihi: ${new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;

    return prompt;
  }

  /**
   * Get formatted conversation history for context
   */
  private async getConversationHistory(
    conversationId: string
  ): Promise<ChatMessage[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: env.MAX_CONTEXT_MESSAGES,
      select: {
        sender: true,
        content: true,
        type: true,
      },
    });

    return messages
      .filter((m) => m.content && m.type === 'TEXT')
      .map((m) => ({
        role: (m.sender === 'CONTACT' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content!,
      }));
  }

  /**
   * Select model based on message complexity
   */
  private selectModel(message: string, historyLength: number): string {
    // Use fast model for simple messages
    const simplePatterns = [
      /^(merhaba|selam|hey|hi|hello)/i,
      /^(evet|hayır|tamam|ok|teşekkür)/i,
      /^.{0,20}$/,
    ];

    if (simplePatterns.some((p) => p.test(message.trim()))) {
      return env.OPENAI_FAST_MODEL;
    }

    // Use default model for normal conversations
    return env.OPENAI_DEFAULT_MODEL;
  }

  /**
   * Analyze message for intent and sentiment (lightweight)
   */
  private async analyzeMessage(
    userMessage: string,
    botResponse: string
  ): Promise<AIResponse['metadata']> {
    // Simple keyword-based analysis (avoid extra API calls)
    const intents: Record<string, string[]> = {
      purchase: ['satın al', 'almak istiyorum', 'fiyat', 'ücret', 'kaç para', 'kaç lira', 'ne kadar', 'rezervasyon'],
      info: ['bilgi', 'detay', 'nasıl', 'nedir', 'hakkında', 'anlatır mısın'],
      complaint: ['şikayet', 'sorun', 'problem', 'memnun değil', 'kötü', 'berbat'],
      support: ['yardım', 'destek', 'iptal', 'değişiklik', 'iade'],
      greeting: ['merhaba', 'selam', 'günaydın', 'iyi günler'],
    };

    let intentDetected = 'general';
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((k) => userMessage.toLowerCase().includes(k))) {
        intentDetected = intent;
        break;
      }
    }

    // Simple sentiment analysis
    const positiveWords = ['teşekkür', 'harika', 'güzel', 'mükemmel', 'süper', 'ilginç'];
    const negativeWords = ['kötü', 'berbat', 'memnun değil', 'sorun', 'problem'];

    const posCount = positiveWords.filter((w) => userMessage.toLowerCase().includes(w)).length;
    const negCount = negativeWords.filter((w) => userMessage.toLowerCase().includes(w)).length;

    const sentiment = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

    // Lead scoring based on intent
    const leadScores: Record<string, number> = {
      purchase: 90,
      info: 60,
      support: 40,
      greeting: 20,
      complaint: 10,
      general: 30,
    };

    return {
      intentDetected,
      sentiment,
      leadScore: leadScores[intentDetected] || 30,
    };
  }
}

export const aiService = new AIService();
