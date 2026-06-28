import { ALL, Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { WudongProductCategoryService } from '../../service/product-category';

@Provide()
@CoolController('/admin/wudong/product-categories')
export class AdminWudongProductCategoryController extends BaseController {
  @Inject()
  wudongProductCategoryService: WudongProductCategoryService;

  @Post('/page', { summary: '商品分类分页' })
  async pageData(@Body(ALL) body) {
    return this.ok(await this.wudongProductCategoryService.pageData(body));
  }

  @Get('/info', { summary: '商品分类详情' })
  async detail(@Query('id') id: number) {
    return this.ok(await this.wudongProductCategoryService.infoById(Number(id)));
  }

  @Post('/save', { summary: '商品分类新增或编辑' })
  async saveItem(@Body(ALL) body) {
    return this.ok(await this.wudongProductCategoryService.saveCategory(body));
  }

  @Post('/status', { summary: '商品分类启停' })
  async status(@Body('id') id: number, @Body('status') status: number) {
    await this.wudongProductCategoryService.setStatus(Number(id), Number(status));
    return this.ok();
  }

  @Post('/delete', { summary: '商品分类软删除' })
  async remove(@Body('ids') ids: number[] | string) {
    const list = Array.isArray(ids)
      ? ids.map(Number)
      : String(ids || '').split(',').map(Number);
    await this.wudongProductCategoryService.softDelete(list.filter(Boolean));
    return this.ok();
  }
}
