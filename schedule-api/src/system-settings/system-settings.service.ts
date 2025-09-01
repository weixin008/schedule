import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SystemSettingsService {
  private readonly settingsFilePath = path.join(__dirname, '..', '..', 'system-settings.json');

  async getRoleNameMapping() {
    const settings = await this.readSettings();
    return settings.roleNameMapping || {};
  }

  async updateRoleNameMapping(newMapping: Record<string, string>) {
    const settings = await this.readSettings();
    settings.roleNameMapping = { ...settings.roleNameMapping, ...newMapping };
    await this.writeSettings(settings);
    return settings.roleNameMapping;
  }

  async getSystemSettings() {
    const settings = await this.readSettings();
    return {
      orgName: settings.orgName || 'Organization Name',
      systemName: settings.systemName || 'Schedule Management System',
      themeColor: settings.themeColor || '#1890ff',
      about: settings.about || 'Intelligent schedule management system providing efficient personnel scheduling solutions.'
    };
  }

  async updateSystemSettings(newSettings: any) {
    const settings = await this.readSettings();
    Object.assign(settings, newSettings);
    await this.writeSettings(settings);
    return this.getSystemSettings();
  }

  private async readSettings() {
    try {
      const data = await fs.readFile(this.settingsFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, return a default structure
      return { roleNameMapping: {} };
    }
  }

  private async writeSettings(settings: any) {
    await fs.writeFile(this.settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
  }
}