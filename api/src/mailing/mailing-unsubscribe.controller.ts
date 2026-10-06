import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { MailingUnsubscribeService } from './mailing-unsubscribe.service';

/** Longest legitimate token: a 320-char address plus a campaign id, base64'd, plus the HMAC. */
const MAX_TOKEN_LENGTH = 1024;

class UnsubscribeBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TOKEN_LENGTH)
  token?: string;
}

/**
 * The target of the unsubscribe link in every campaign footer.
 *
 * Public by necessity — the person is clicking from their inbox, usually signed
 * out, and often not a user at all. What stands in for authentication is the
 * token: HMAC-signed over the recipient and the campaign, so a link cannot be
 * forged for someone else's address. It is rate-limited per IP like the other
 * public endpoints.
 *
 * Two routes, deliberately: `GET status` only reads, so link scanners and
 * prefetchers that follow every URL in an email cannot unsubscribe anyone;
 * `POST` is the one that acts, and the page only sends it when the person
 * presses the button.
 */
@ApiTags('mailing')
@Controller('mailing/unsubscribe')
export class MailingUnsubscribeController {
  constructor(private readonly unsubscribe: MailingUnsubscribeService) {}

  @Public()
  @Get('status')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Check an unsubscribe link without acting on it' })
  async status(@Query('token') token?: string) {
    const status = await this.unsubscribe.inspect(requireToken(token));
    if (!status) throw invalidLink();
    return { success: true, data: status };
  }

  @Public()
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Unsubscribe the recipient named by the link from campaign mail' })
  async confirm(@Query('token') queryToken?: string, @Body() body?: UnsubscribeBodyDto) {
    // The query string is where a mail client's one-click POST would put it; the
    // body is where the page does.
    const done = await this.unsubscribe.unsubscribe(requireToken(queryToken ?? body?.token));
    if (!done) throw invalidLink();
    return { success: true };
  }
}

function requireToken(token: unknown): string {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    throw invalidLink();
  }
  return token;
}

function invalidLink() {
  return new BadRequestException({
    success: false,
    code: 'invalid_unsubscribe_link',
    message: 'This unsubscribe link is not valid.',
  });
}
