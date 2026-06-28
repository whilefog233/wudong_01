import { ALL, Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import {
  BaseController,
  CoolController,
  CoolTag,
  TagTypes,
} from '@cool-midway/core';
import { WudongProductService } from '../../service/product';
import { BaseSysLoginService } from '../../../base/service/sys/login';

@Provide()
@CoolController('/admin/wudong/products')
export class AdminWudongProductController extends BaseController {
  @Inject()
  wudongProductService: WudongProductService;

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

  @Post('/page', { summary: '商品分页' })
  async pageData(@Body(ALL) body) {
    return this.ok(await this.wudongProductService.adminPage(body));
  }

  @Get('/info', { summary: '商品详情' })
  async detail(@Query('id') id: number) {
    return this.ok(await this.wudongProductService.adminInfo(Number(id)));
  }

  @Post('/save', { summary: '商品新增或编辑' })
  async saveItem(@Body(ALL) body) {
    return this.ok(await this.wudongProductService.save(body));
  }

  @Post('/status', { summary: '商品上架下架' })
  async status(@Body('id') id: number, @Body('status') status: number) {
    await this.wudongProductService.setStatus(Number(id), Number(status));
    return this.ok();
  }

  @Post('/delete', { summary: '商品软删除' })
  async remove(@Body('ids') ids: number[] | string) {
    await this.wudongProductService.delete(ids);
    return this.ok();
  }
}
