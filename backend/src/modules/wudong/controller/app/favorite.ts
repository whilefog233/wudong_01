import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { WudongFavoriteService } from '../../service/favorite';

@Provide()
@CoolController('/app/wudong/favorites')
export class AppWudongFavoriteController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  wudongFavoriteService: WudongFavoriteService;

  @Get('/page', { summary: '我的收藏分页' })
  async pageData(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number
  ) {
    return this.ok(
      await this.wudongFavoriteService.pageData(
        { page, pageSize },
        Number(this.ctx.user.id)
      )
    );
  }

  @Post('/add', { summary: '添加收藏' })
  async addFavorite(@Body('productId') productId: number) {
    await this.wudongFavoriteService.addFavorite(
      Number(productId),
      Number(this.ctx.user.id)
    );
    return this.ok();
  }

  @Post('/delete', { summary: '取消收藏' })
  async deleteFavorite(@Body('productId') productId: number) {
    await this.wudongFavoriteService.deleteFavorite(
      Number(productId),
      Number(this.ctx.user.id)
    );
    return this.ok();
  }
}
