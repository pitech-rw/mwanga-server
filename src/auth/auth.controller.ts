import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
import { SignUpDto } from './sign-up.dto.js';

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
}
