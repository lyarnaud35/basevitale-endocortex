import { LoggerService, Injectable } from '@nestjs/common';

/**
 * LoggerService personnalisé
 * 
 * Service de logging centralisé pour BaseVitale
 * Permet d'ajouter du contexte et de formater les logs
 */
@Injectable()
export class BaseVitaleLogger implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    const ctx = context || this.context || 'BaseVitale';
    console.log(`[${new Date().toISOString()}] [${ctx}] ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    const ctx = context || this.context || 'BaseVitale';
    console.error(`[${new Date().toISOString()}] [${ctx}] ERROR: ${message}`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    const ctx = context || this.context || 'BaseVitale';
    console.warn(`[${new Date().toISOString()}] [${ctx}] WARN: ${message}`);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      const ctx = context || this.context || 'BaseVitale';
      console.debug(`[${new Date().toISOString()}] [${ctx}] DEBUG: ${message}`);
    }
  }

  verbose(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      const ctx = context || this.context || 'BaseVitale';
      console.log(`[${new Date().toISOString()}] [${ctx}] VERBOSE: ${message}`);
    }
  }
}
