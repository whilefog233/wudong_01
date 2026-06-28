import { Get, Inject, Provide, Query } from '@midwayjs/core';
import {
  BaseController,
  CoolController,
  CoolTag,
  CoolUrlTag,
  TagTypes,
} from '@cool-midway/core';
import { WudongProductService } from '../../service/product';

@CoolUrlTag()
@Provide()
@CoolController('/app/wudong/products')
export class AppWudongProductController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  wudongProductService: WudongProductService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/page', { summary: '普通用户商品分页' })
  async listPage(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('categoryId') categoryId: number,
    @Query('keyWord') keyWord: string
  ) {
    return this.ok(
      await this.wudongProductService.appPage(
        { page, pageSize, categoryId, keyWord },
        this.ctx.user?.id
      )
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/detail', { summary: '普通用户商品详情' })
  async productDetail(@Query('id') id: number) {
    return this.ok(
      await this.wudongProductService.appInfo(Number(id), this.ctx.user?.id)
    );
  }
}
