import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('complete-profile')
  @UseGuards(ClerkAuthGuard)
  async completeProfile(@Request() req, @Body() dto: CompleteProfileDto) {
    return this.authService.completeProfile(req.user.clerkId, dto);
  }
}
