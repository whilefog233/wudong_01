import { Get, Inject, Provide } from '@midwayjs/core';
import {
  BaseController,
  CoolController,
  CoolTag,
  CoolUrlTag,
  TagTypes,
} from '@cool-midway/core';
import { WudongProductCategoryService } from '../../service/product-category';

@CoolUrlTag()
@Provide()
@CoolController('/app/wudong/product-categories')
export class AppWudongProductCategoryController extends BaseController {
  @Inject()
  wudongProductCategoryService: WudongProductCategoryService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/list', { summary: '启用分类列表' })
  async list() {
    return this.ok(await this.wudongProductCategoryService.listEnabled());
  }
}
