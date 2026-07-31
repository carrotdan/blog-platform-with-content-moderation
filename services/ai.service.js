/**
 * AI Service - Connects to Python XLM-Roberta Microservice
 * to classify content: NORMAL, SPAM, TOXIC
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '5000');
const logger = require('../utils/logger');
const { Mutex } = require('async-mutex');

class AIService {
  constructor() {
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED',
      threshold: 5,
      resetTimeout: 60000
    };
    this.circuitBreakerMutex = new Mutex();
  }

  /**
   * Get circuit breaker state atomically
   */
  async getCircuitBreakerState() {
    return this.circuitBreakerMutex.runExclusive(() => ({
      state: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      lastFailure: this.circuitBreaker.lastFailure
    }));
  }

  /**
   * Update circuit breaker on failure atomically
   */
  async recordFailure() {
    return this.circuitBreakerMutex.runExclusive(() => {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = Date.now();
      
      if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
        this.circuitBreaker.state = 'OPEN';
      }
      
      return {
        failures: this.circuitBreaker.failures,
        state: this.circuitBreaker.state
      };
    });
  }

  /**
   * Reset circuit breaker on success atomically
   */
  async resetCircuitBreaker() {
    return this.circuitBreakerMutex.runExclusive(() => {
      this.circuitBreaker.failures = 0;
      this.circuitBreaker.state = 'CLOSED';
    });
  }

  /**
   * Check and update circuit breaker state atomically
   */
  async checkAndUpdateCircuitBreaker() {
    return this.circuitBreakerMutex.runExclusive(() => {
      if (this.circuitBreaker.state === 'OPEN') {
        const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure;
        if (timeSinceLastFailure > this.circuitBreaker.resetTimeout) {
          this.circuitBreaker.state = 'HALF_OPEN';
          return { allowRequest: true, state: 'HALF_OPEN' };
        }
        return { allowRequest: false, state: 'OPEN' };
      }
      return { allowRequest: true, state: this.circuitBreaker.state };
    });
  }

  /**
   * Analyze text to detect spam and toxicity.
   * Calls the Python microservice running the fine-tuned XLM-Roberta model.
   *
   * @param {string} text - Text to analyze
   * @returns {Promise<{spam_score: number, toxicity_score: number, label: string}>}
   */
  async analyze(text) {
    // If text is empty, return NORMAL immediately
    if (!text || text.trim().length === 0) {
      return { spam_score: 0.05, toxicity_score: 0.05, label: 'NORMAL' };
    }

    // Check circuit breaker atomically
    const circuitBreakerCheck = await this.checkAndUpdateCircuitBreaker();
    if (!circuitBreakerCheck.allowRequest) {
      logger.warn('[AIService] Circuit breaker OPEN - failing closed');
      return {
        spam_score: 0.5,
        toxicity_score: 0.5,
        label: 'AI_UNAVAILABLE'
      };
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

      // Success - reset circuit breaker atomically
      await this.resetCircuitBreaker();

      return {
        spam_score: result.spam_score ?? 0.1,
        toxicity_score: result.toxicity_score ?? 0.1,
        label: result.label ?? 'NORMAL'
      };

    } catch (error) {
      // Record failure atomically
      await this.recordFailure();

      if (error.name === 'AbortError') {
        logger.warn('[AIService] Request timed out - failing closed');
      } else if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
        logger.warn('[AIService] Python service unavailable (ECONNREFUSED) - failing closed');
      } else {
        logger.error('[AIService] Error calling AI microservice', { error: error.message });
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
   * Check whether the Python AI service is running
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
