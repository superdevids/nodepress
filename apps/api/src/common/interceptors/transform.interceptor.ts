import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Wraps every successful response in a standard envelope:
 * { success, data, meta?, timestamp }
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((raw) => {
        // If the handler already returned an envelope, pass through
        if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
          return { ...raw, timestamp: new Date().toISOString() };
        }

        // If the response has a `meta` sibling (e.g. pagination), extract it
        const { data, meta } = this.extractMeta(raw);

        return {
          success: true,
          data,
          ...(meta ? { meta } : {}),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private extractMeta(value: any): { data: any; meta?: Record<string, unknown> } {
    if (
      value &&
      typeof value === 'object' &&
      'items' in value &&
      'meta' in value
    ) {
      return { data: value.items, meta: value.meta };
    }
    return { data: value };
  }
}
