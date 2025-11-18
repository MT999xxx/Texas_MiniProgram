import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { MemberEntity } from '../membership/member.entity';
import { MembershipLevelEntity } from '../membership/membership-level.entity';
import { WxLoginDto } from './dto/wx-login.dto';

interface WxSession {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
    @InjectRepository(MembershipLevelEntity)
    private readonly levelRepo: Repository<MembershipLevelEntity>,
  ) {}

  async wxLogin(dto: WxLoginDto) {
    // 1. 调用微信API获取openid
    const wxSession = await this.getWxSession(dto.code);

    if (wxSession.errcode) {
      throw new UnauthorizedException(`微信登录失败: ${wxSession.errmsg}`);
    }

    // 2. 查找或创建用户
    let member = await this.memberRepo.findOne({
      where: { userId: wxSession.openid },
      relations: ['level'],
    });

    if (!member) {
      // 获取默认会员等级
      const defaultLevel = await this.levelRepo.findOne({
        where: { level: 1 },
        order: { level: 'ASC' },
      });

      // 创建新用户
      member = this.memberRepo.create({
        userId: wxSession.openid,
        nickname: dto.nickname || '新用户',
        phone: '',
        points: 0,
        level: defaultLevel || undefined,
        levelCode: defaultLevel?.code,
      });

      await this.memberRepo.save(member);
    } else if (dto.nickname || dto.avatarUrl) {
      // 更新用户信息
      if (dto.nickname) member.nickname = dto.nickname;
      await this.memberRepo.save(member);
    }

    // 3. 生成JWT token
    const payload = {
      sub: member.id,
      openid: wxSession.openid,
    };

    const token = this.jwtService.sign(payload);

    // 4. 返回用户信息和token
    return {
      token,
      user: {
        id: member.id,
        userId: member.userId,
        nickname: member.nickname,
        phone: member.phone,
        points: member.points,
        level: member.level,
      },
    };
  }

  private async getWxSession(code: string): Promise<WxSession> {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appid || !secret) {
      // 开发环境：返回模拟数据
      console.warn('⚠️  未配置微信AppID和Secret，使用模拟登录');
      return {
        openid: `test_openid_${Date.now()}`,
        session_key: 'test_session_key',
      };
    }

    try {
      const url = 'https://api.weixin.qq.com/sns/jscode2session';
      const response = await axios.get<WxSession>(url, {
        params: {
          appid,
          secret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      });

      return response.data;
    } catch (error) {
      console.error('调用微信API失败:', error);
      throw new UnauthorizedException('微信登录失败');
    }
  }

  async validateUser(userId: string) {
    const member = await this.memberRepo.findOne({
      where: { id: userId },
      relations: ['level'],
    });

    if (!member) {
      throw new UnauthorizedException('用户不存在');
    }

    return member;
  }
}