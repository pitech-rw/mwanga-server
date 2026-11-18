import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './login.dto.js';
import { MeQueryDto } from './me-query.dto.js';
import { Public } from './public.decorator.js';
import { ForgotPasswordDto } from './forgot-password.dto.js';
import { ResetPasswordDto } from './reset-password.dto.js';
import { SignUpDto } from './sign-up.dto.js';
import { UpdateMeDto } from './update-me.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Sign in with username or email',
  })
  @ApiOkResponse({ description: 'JWT access token and user profile' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto): ReturnType<AuthService['login']> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('signup')
  @ApiOperation({
    summary: 'Create a rider account and sign in',
    description:
      'Public self-service registration. Always creates User.type=rider with the rider role. Staff accounts are created via POST /users by an administrator.',
  })
  @ApiCreatedResponse({ description: 'JWT access token and user profile (same shape as login)' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicate username/email/phone' })
  signUp(@Body() signUpDto: SignUpDto): ReturnType<AuthService['signUp']> {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({ description: 'Generic acknowledgment (does not reveal whether the email exists)' })
  forgotPassword(@Body() dto: ForgotPasswordDto): ReturnType<AuthService['requestPasswordReset']> {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using a reset token from email' })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ description: 'Invalid or expired reset token' })
  resetPassword(@Body() dto: ResetPasswordDto): ReturnType<AuthService['resetPassword']> {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Current authenticated user',
    description:
      'Returns a profile filtered by view=persona (default) or view=full. User.type must match Role.name.',
  })
  @ApiQuery({
    name: 'view',
    required: false,
    enum: ['persona', 'full'],
    description: 'persona: type-specific field subset; full: complete safe profile',
  })
  @ApiOkResponse({ description: 'User profile with role and permissions' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'User.type does not match Role.name' })
  me(@CurrentUser() user: AuthenticatedUser, @Query() query: MeQueryDto) {
    return this.authService.getProfile(user.sub, query.view ?? 'persona');
  }

  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update the signed-in user profile',
    description: 'Self-service updates for name, contact details, image, and password.',
  })
  @ApiOkResponse({ description: 'Updated profile (view=full field set with role and permissions)' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'Validation error or duplicate username/email/phone' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.authService.updateProfile(user.sub, dto);
  }
}
