import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthPipelineGuard } from '../auth/guards/auth-pipeline.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LlmClient } from './llm-client';
import { EchoValidateSchema } from './agents/echo-validate/schema';

@Controller('ai/health')
@UseGuards(AuthPipelineGuard)
export class AiHealthController {
  constructor(private readonly llm: LlmClient) {}

  @Post('echo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async echo(@Body() body: { message: string; userId: string; role?: string }) {
    const result = await this.llm.run({
      agent: 'echo-validate',
      input: { message: body.message },
      schema: EchoValidateSchema,
      principal: {
        userId: body.userId,
        role: UserRole.SUPER_ADMIN,
      },
    });
    return { ...result };
  }
}
