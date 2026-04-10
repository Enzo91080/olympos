import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OracleService } from './oracle.service';

@Controller('oracle')
@UseGuards(JwtAuthGuard)
export class OracleController {
  constructor(private oracleService: OracleService) {}

  @Post('ask')
  async ask(@Body() body: { question: string }, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.oracleService.streamAnswer(body.question, (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
}
