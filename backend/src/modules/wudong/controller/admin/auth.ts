import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import {
  BaseController,
  CoolController,
  CoolTag,
  TagTypes,
} from '@cool-midway/core';
import { Validate } from '@midwayjs/validate';
import { LoginDTO } from '../../../base/dto/login';
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
  @Validate()
  async login(@Body() login: LoginDTO) {
    return this.ok(await this.baseSysLoginService.login(login));
  }
}
