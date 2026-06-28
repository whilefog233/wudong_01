import { ALL, Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import {
  BaseController,
  CoolController,
  CoolTag,
  TagTypes,
} from '@cool-midway/core';
import { BaseSysLoginService } from '../../../base/service/sys/login';

@Provide()
@CoolController('/admin/wudong/auth')
export class AdminWudongAuthController extends BaseController {
  @Inject()
  baseSysLoginService: BaseSysLoginService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/captcha', { summary: '后台登录验证码' })
  async captcha(
    @Query('width') width: number,
    @Query('height') height: number,
    @Query('color') color: string
  ) {
    return this.ok(
      await this.baseSysLoginService.captcha(width, height, color)
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/login', { summary: '后台登录' })
  async login(@Body(ALL) login: { username: string; password: string }) {
    return this.ok(
      await this.baseSysLoginService.loginWithoutCaptcha({
        username: login.username,
        password: login.password,
      })
    );
  }
}
