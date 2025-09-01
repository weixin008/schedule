import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async register(createUserDto: CreateUserDto & { role?: string }) {
    // 检查用户名是否已存在
    const existingUser = await this.userService.findOneByUsername(createUserDto.username);
    
    if (existingUser) {
      throw new ConflictException('用户名已被占用');
    }
    
    // 检查邮箱是否已存在
    if (createUserDto.email) {
      const existingEmail = await this.userService.findOneByEmail(createUserDto.email);
      
      if (existingEmail) {
        throw new ConflictException('邮箱已被占用');
      }
    }

    // 使用前端传递的角色或默认'staff'
    // 为新用户生成唯一的organizationId
    const organizationId = createUserDto.organizationId || `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const userDto: CreateUserDto = {
      ...createUserDto,
      role: createUserDto.role || 'staff',
      organizationId: organizationId,
    };
    
    const newUser = await this.userService.create(userDto);
    return newUser;
  }

  async signIn(username: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      throw new UnauthorizedException();
    }
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }
    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.role,
      organizationId: user.organizationId || 'default'
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getProfile(userId: number) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    // 确保不返回密码
    const { password, ...result } = user;
    return result;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    return this.userService.update(userId, updateProfileDto);
  }
} 