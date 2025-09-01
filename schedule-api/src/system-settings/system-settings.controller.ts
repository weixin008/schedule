import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  async getSystemSettings() {
    return this.systemSettingsService.getSystemSettings();
  }

  @Post()
  async updateSystemSettings(@Body() settings: any) {
    return this.systemSettingsService.updateSystemSettings(settings);
  }

  @Get('roles')
  async getRoleNameMapping() {
    return this.systemSettingsService.getRoleNameMapping();
  }

  @Post('roles')
  async updateRoleNameMapping(@Body() mapping: Record<string, string>) {
    return this.systemSettingsService.updateRoleNameMapping(mapping);
  }
}