import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * MetricsService
 * 
 * Service pour collecter et exposer des métriques
 * 
 * Note: Pour la production, intégrer avec Prometheus/Grafana
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private timings: Map<string, number[]> = new Map();

  onModuleInit() {
    this.logger.log('MetricsService initialized');
  }

  /**
   * Incrémenter un compteur
   */
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Enregistrer une valeur
   */
  recordValue(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  /**
   * Enregistrer un timing (durée en ms)
   */
  recordTiming(name: string, durationMs: number): void {
    const timings = this.timings.get(name) || [];
    timings.push(durationMs);
    
    // Garder seulement les 1000 derniers timings
    if (timings.length > 1000) {
      timings.shift();
    }
    
    this.timings.set(name, timings);
  }

  /**
   * Obtenir toutes les métriques
   */
  getMetrics(): {
    counters: Record<string, number>;
    values: Record<string, number>;
    timings: Record<string, { count: number; avg: number; min: number; max: number }>;
  } {
    const counters: Record<string, number> = {};
    for (const [key, value] of this.counters.entries()) {
      counters[key] = value;
    }

    const values: Record<string, number> = {};
    for (const [key, value] of this.metrics.entries()) {
      values[key] = value;
    }

    const timings: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    for (const [key, values] of this.timings.entries()) {
      if (values.length === 0) continue;
      
      const sum = values.reduce((a, b) => a + b, 0);
      timings[key] = {
        count: values.length,
        avg: Math.round(sum / values.length),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return { counters, values, timings };
  }

  /**
   * Réinitialiser les métriques
   */
  reset(): void {
    this.counters.clear();
    this.metrics.clear();
    this.timings.clear();
  }
}
