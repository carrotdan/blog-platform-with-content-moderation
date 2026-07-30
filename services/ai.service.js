/**
 * AI Service - Kết nối với Python XLM-Roberta Microservice
 * để phân loại nội dung: NORMAL, SPAM, TOXIC
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '10000');

class AIService {
  /**
   * Phân tích văn bản để phát hiện spam và toxicity.
   * Gọi Python microservice chạy model XLM-Roberta đã fine-tuned.
   *
   * @param {string} text - Văn bản cần phân tích
   * @returns {Promise<{spam_score: number, toxicity_score: number, label: string}>}
   */
  async analyze(text) {
    // Nếu text rỗng, trả về NORMAL ngay
    if (!text || text.trim().length === 0) {
      return { spam_score: 0.05, toxicity_score: 0.05, label: 'NORMAL' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Service responded with ${response.status}: ${errText}`);
      }

      const result = await response.json();

      return {
        spam_score: result.spam_score ?? 0.1,
        toxicity_score: result.toxicity_score ?? 0.1,
        label: result.label ?? 'NORMAL'
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[AIService] Request timed out - failing closed');
      } else if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
        console.warn('[AIService] Python service unavailable (ECONNREFUSED) - failing closed');
      } else {
        console.error('[AIService] Error calling AI microservice:', error.message);
      }

      // Fail-closed: if AI service unavailable, treat as potentially harmful
      // Return special label to indicate AI was unavailable, so content gets HIDDEN + queued
      return {
        spam_score: 0.5,
        toxicity_score: 0.5,
        label: 'AI_UNAVAILABLE'
      };
    }
  }

  /**
   * Kiểm tra xem Python AI service có đang chạy không
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${AI_SERVICE_URL}/health`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

module.exports = new AIService();
