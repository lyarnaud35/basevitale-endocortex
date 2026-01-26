import { Logger } from '@nestjs/common';

/**
 * Decorator pour logger l'exécution d'une méthode
 * 
 * @param logger - Logger à utiliser
 * @param logArgs - Logger les arguments (défaut: false)
 * 
 * @example
 * class MyService {
 *   private readonly logger = new Logger(MyService.name);
 * 
 *   @LogExecution(this.logger, true)
 *   async processData(data: any) {
 *     // ...
 *   }
 * }
 */
export function LogExecution(logger?: Logger, logArgs: boolean = false) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const log = logger || new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      if (logArgs) {
        log.debug(`Executing ${propertyKey} with args:`, args);
      } else {
        log.debug(`Executing ${propertyKey}`);
      }

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        log.debug(`Completed ${propertyKey} in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        log.error(`Failed ${propertyKey} after ${duration}ms: ${error}`);
        throw error;
      }
    };

    return descriptor;
  };
}
