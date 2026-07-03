import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

interface CspViolationReport {
  'csp-report'?: {
    'document-uri'?: string;
    'referrer'?: string;
    'blocked-uri'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'source-file'?: string;
    'script-sample'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'disposition'?: string;
  };
  type?: string;
  url?: string;
  body?: {
    report?: {
      'document-uri'?: string;
      'violated-directive'?: string;
      'blocked-uri'?: string;
    };
  };
}

@ApiTags('CSP')
@Controller('csp-violation')
export class CspViolationController {
  private readonly logger = new Logger('CspViolation');

  @Public()
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Receive CSP violation reports' })
  report(@Body() report: CspViolationReport) {
    const cspReport = report['csp-report'] || report.body?.report || report;

    this.logger.warn({
      msg: 'CSP Violation',
      documentUri: (cspReport as any)['document-uri'] || report.url,
      violatedDirective: (cspReport as any)['violated-directive'],
      blockedUri: (cspReport as any)['blocked-uri'],
      sourceFile: (cspReport as any)['source-file'],
      lineNumber: (cspReport as any)['line-number'],
      disposition: (cspReport as any)['disposition'] || 'enforce',
      timestamp: new Date().toISOString(),
    });
  }
}
