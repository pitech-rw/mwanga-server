import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/public.decorator.js';
import { AppService } from './app.service.js';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Welcome message' })
  @ApiOkResponse({ description: 'Plain text greeting', type: String })
  getHello() {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check with database connectivity' })
  @ApiOkResponse({
    description: 'Service and database status',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        database: { type: 'string', example: 'postgres' },
        userCount: { type: 'number', example: 0 },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
