import { Module } from '@nestjs/common';
import { OracleController } from './oracle.controller';
import { OracleService } from './oracle.service';

@Module({
  controllers: [OracleController],
  providers: [OracleService],
})
export class OracleModule {}
