import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Inject, Provide } from '@midwayjs/core';
import { In, Repository } from 'typeorm';
import { WudongFavoriteEntity } from '../entity/favorite';
import { WudongProductCategoryEntity } from '../entity/product-category';
import { WudongProductImageEntity } from '../entity/product-image';
import { WudongProductEntity } from '../entity/product';
import { WudongProductSkuEntity } from '../entity/product-sku';

@Provide()
export class WudongProductService extends BaseService {
  @InjectEntityModel(WudongProductCategoryEntity)
  productCategoryEntity: Repository<WudongProductCategoryEntity>;

  @InjectEntityModel(WudongProductEntity)
  productEntity: Repository<WudongProductEntity>;

  @InjectEntityModel(WudongProductSkuEntity)
  productSkuEntity: Repository<WudongProductSkuEntity>;

  @InjectEntityModel(WudongProductImageEntity)
  productImageEntity: Repository<WudongProductImageEntity>;

  @InjectEntityModel(WudongFavoriteEntity)
  favoriteEntity: Repository<WudongFavoriteEntity>;

  @Inject()
  ctx;

  private getPageParams(query) {
    const page = Math.max(Number(query?.page) || 1, 1);
    const pageSize = Math.max(Number(query?.pageSize) || 10, 1);
    return { page, pageSize };
  }

  private parseIdList(ids: string | number[] | number) {
    if (Array.isArray(ids)) {
      return ids.map(id => Number(id)).filter(Boolean);
    }
    if (typeof ids === 'number') {
      return ids ? [ids] : [];
    }
    return String(ids || '')
      .split(',')
      .map(id => Number(id.trim()))
      .filter(Boolean);
  }

  private normalizeStatus(value, defaultValue = 0) {
    if (value === 0 || value === 1 || value === '0' || value === '1') {
      return Number(value);
    }
    return defaultValue;
  }

  private normalizeSkus(items) {
    if (!Array.isArray(items)) {
      throw new CoolCommException('商品 SKU 必须为数组');
    }

    return items.map((item, index) => {
      const name = String(item?.name || '').trim();
      if (!name) {
        throw new CoolCommException(`第 ${index + 1} 个 SKU 名称不能为空`);
      }

      const stock = Number(item?.stock ?? 0);
      if (!Number.isInteger(stock) || stock < 0) {
        throw new CoolCommException(`第 ${index + 1} 个 SKU 库存不能小于 0`);
      }

      const salePrice = Number(item?.salePrice ?? 0);
      if (Number.isNaN(salePrice) || salePrice < 0) {
        throw new CoolCommException(`第 ${index + 1} 个 SKU 销售价不合法`);
      }

      const originalPrice = Number(item?.originalPrice ?? salePrice);
      if (Number.isNaN(originalPrice) || originalPrice < 0) {
        throw new CoolCommException(`第 ${index + 1} 个 SKU 原价不合法`);
      }

      return {
        id: Number(item?.id) || undefined,
        code: item?.code ? String(item.code).trim() : null,
        name,
        specs: item?.specs ?? null,
        salePrice,
        originalPrice,
        stock,
        status: this.normalizeStatus(item?.status, 1),
        sortOrder: Number(item?.sortOrder ?? index),
      };
    });
  }

  private normalizeImages(items) {
    if (!Array.isArray(items)) {
      throw new CoolCommException('商品图片必须为数组');
    }

    const list = items.map((item, index) => {
      const url = String(item?.url || '').trim();
      if (!url) {
        throw new CoolCommException(`第 ${index + 1} 张商品图片不能为空`);
      }

      return {
        id: Number(item?.id) || undefined,
        url,
        isMain: this.normalizeStatus(item?.isMain, 0),
        sortOrder: Number(item?.sortOrder ?? index),
      };
    });

    const mainIndex = list.findIndex(item => item.isMain === 1);

    return list.map((item, index) => ({
      ...item,
      isMain:
        mainIndex === -1 ? (index === 0 ? 1 : 0) : index === mainIndex ? 1 : 0,
      sortOrder: Number(item.sortOrder ?? index),
    }));
  }

  private calcPriceRange(
    skus: Array<Pick<WudongProductSkuEntity, 'salePrice' | 'deleted' | 'status'>>
  ) {
    const activeSkus = skus.filter(item => item.deleted === 0 && item.status === 1);
    if (!activeSkus.length) {
      return { minPrice: 0, maxPrice: 0 };
    }
    const prices = activeSkus.map(item => Number(item.salePrice));
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }

  private calcSoldOut(
    skus: Array<Pick<WudongProductSkuEntity, 'stock' | 'deleted' | 'status'>>
  ) {
    const activeSkus = skus.filter(item => item.deleted === 0 && item.status === 1);
    if (!activeSkus.length) {
      return true;
    }
    return activeSkus.every(item => Number(item.stock) <= 0);
  }

  private async getCategory(categoryId: number, mustEnabled = false) {
    const category = await this.productCategoryEntity.findOneBy({
      id: categoryId,
      deleted: 0,
    });

    if (!category) {
      throw new CoolCommException('商品分类不存在');
    }

    if (mustEnabled && category.status !== 1) {
      throw new CoolCommException('商品分类未启用，不能上架商品');
    }

    return category;
  }

  private async validateBeforePublish(
    product,
    category: WudongProductCategoryEntity,
    skus: WudongProductSkuEntity[],
    images: WudongProductImageEntity[]
  ) {
    if (!product.title) {
      throw new CoolCommException('商品标题不能为空');
    }
    if (!category || category.status !== 1) {
      throw new CoolCommException('商品分类未启用，不能上架商品');
    }
    if (!product.craftIntro) {
      throw new CoolCommException('商品上架前必须填写工艺介绍');
    }
    if (!product.inheritorName) {
      throw new CoolCommException('商品上架前必须填写传承人姓名');
    }
    if (!product.inheritorIntro) {
      throw new CoolCommException('商品上架前必须填写传承人介绍');
    }
    const activeSkus = skus.filter(item => item.deleted === 0 && item.status === 1);
    if (!activeSkus.length) {
      throw new CoolCommException('商品上架前至少需要一个启用的 SKU');
    }
    if (!images.filter(item => item.deleted === 0).length) {
      throw new CoolCommException('商品上架前至少需要一张商品图片');
    }
  }

  private async syncSkus(productId: number, items: any[], manager) {
    const repo = manager.getRepository(WudongProductSkuEntity);
    const existing = await repo.find({
      where: {
        productId,
        deleted: 0,
      },
    });
    const existingMap = new Map(existing.map(item => [item.id, item]));
    const keepIds: number[] = [];

    for (const item of items) {
      if (item.id && !existingMap.has(item.id)) {
        throw new CoolCommException('存在不属于当前商品的 SKU');
      }
      const saved = await repo.save({
        ...(item.id ? existingMap.get(item.id) : repo.create()),
        productId,
        code: item.code,
        name: item.name,
        specs: item.specs,
        salePrice: item.salePrice,
        originalPrice: item.originalPrice,
        stock: item.stock,
        status: item.status,
        sortOrder: item.sortOrder,
        deleted: 0,
      });
      keepIds.push(saved.id);
    }

    const removeIds = existing
      .filter(item => !keepIds.includes(item.id))
      .map(item => item.id);

    if (removeIds.length) {
      await repo
        .createQueryBuilder()
        .update(WudongProductSkuEntity)
        .set({
          deleted: 1,
          updateTime: new Date() as any,
        })
        .where('id in (:...ids)', { ids: removeIds })
        .execute();
    }
  }

  private async syncImages(productId: number, items: any[], manager) {
    const repo = manager.getRepository(WudongProductImageEntity);
    const existing = await repo.find({
      where: {
        productId,
        deleted: 0,
      },
    });
    const existingMap = new Map(existing.map(item => [item.id, item]));
    const keepIds: number[] = [];

    for (const item of items) {
      if (item.id && !existingMap.has(item.id)) {
        throw new CoolCommException('存在不属于当前商品的图片');
      }
      const saved = await repo.save({
        ...(item.id ? existingMap.get(item.id) : repo.create()),
        productId,
        url: item.url,
        isMain: item.isMain,
        sortOrder: item.sortOrder,
        deleted: 0,
      });
      keepIds.push(saved.id);
    }

    const removeIds = existing
      .filter(item => !keepIds.includes(item.id))
      .map(item => item.id);

    if (removeIds.length) {
      await repo
        .createQueryBuilder()
        .update(WudongProductImageEntity)
        .set({
          deleted: 1,
          updateTime: new Date() as any,
        })
        .where('id in (:...ids)', { ids: removeIds })
        .execute();
    }
  }

  private async loadProductDetails(productIds: number[], userId?: number) {
    if (!productIds.length) {
      return {
        categoryMap: new Map(),
        skuMap: new Map(),
        imageMap: new Map(),
        favoriteSet: new Set<number>(),
      };
    }

    const products = await this.productEntity.find({
      where: {
        id: In(productIds),
        deleted: 0,
      },
    });

    const categoryIds = [...new Set(products.map(item => item.categoryId))];

    const [categories, skus, images, favorites] = await Promise.all([
      categoryIds.length
        ? this.productCategoryEntity.find({
            where: {
              id: In(categoryIds),
            },
          })
        : [],
      this.productSkuEntity.find({
        where: {
          productId: In(productIds),
          deleted: 0,
        },
        order: {
          sortOrder: 'ASC',
          id: 'ASC',
        },
      }),
      this.productImageEntity.find({
        where: {
          productId: In(productIds),
          deleted: 0,
        },
        order: {
          isMain: 'DESC',
          sortOrder: 'ASC',
          id: 'ASC',
        },
      }),
      userId
        ? this.favoriteEntity.find({
            where: {
              userId,
              productId: In(productIds),
              deleted: 0,
            },
          })
        : [],
    ]);

    const categoryMap = new Map<number, WudongProductCategoryEntity>(
      categories.map(item => [item.id, item] as [number, WudongProductCategoryEntity])
    );
    const skuMap = new Map<number, WudongProductSkuEntity[]>();
    const imageMap = new Map<number, WudongProductImageEntity[]>();

    skus.forEach(item => {
      const list = skuMap.get(item.productId) || [];
      list.push(item);
      skuMap.set(item.productId, list);
    });

    images.forEach(item => {
      const list = imageMap.get(item.productId) || [];
      list.push(item);
      imageMap.set(item.productId, list);
    });

    return {
      categoryMap,
      skuMap,
      imageMap,
      favoriteSet: new Set(favorites.map(item => item.productId)),
    };
  }

  private buildProductCard(
    product: WudongProductEntity,
    details,
    includeDraftData = true
  ) {
    const category = details.categoryMap.get(product.categoryId);
    const skus = details.skuMap.get(product.id) || [];
    const activeSkus = skus.filter(item => item.deleted === 0 && item.status === 1);
    const images = details.imageMap.get(product.id) || [];
    const cover = images.find(item => item.isMain === 1) || images[0];
    const totalStock = activeSkus.reduce(
      (sum, item) => sum + Number(item.stock || 0),
      0
    );

    return {
      ...product,
      categoryName: category?.name || '',
      categoryStatus: category?.status ?? 0,
      coverImage: cover?.url || '',
      soldOut: this.calcSoldOut(skus),
      totalStock,
      skuCount: skus.length,
      imageCount: images.length,
      isFavorite: details.favoriteSet.has(product.id),
      minPrice: Number(product.minPrice || 0),
      maxPrice: Number(product.maxPrice || 0),
      statusText: product.status === 1 ? '上架' : '下架',
      usable: includeDraftData
        ? true
        : product.status === 1 && category?.status === 1 && product.deleted === 0,
    };
  }

  async adminPage(query) {
    const { page, pageSize } = this.getPageParams(query);
    const keyWord = String(query?.keyWord || '').trim();
    const qb = this.productEntity
      .createQueryBuilder('p')
      .where('p.deleted = :deleted', { deleted: 0 });

    if (keyWord) {
      qb.andWhere(
        '(p.title like :keyWord or p.subtitle like :keyWord or p.inheritorName like :keyWord)',
        { keyWord: `%${keyWord}%` }
      );
    }

    if (query?.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }

    if (
      query?.status === 0 ||
      query?.status === 1 ||
      query?.status === '0' ||
      query?.status === '1'
    ) {
      qb.andWhere('p.status = :status', { status: Number(query.status) });
    }

    qb.orderBy('p.sortOrder', 'ASC')
      .addOrderBy('p.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    const details = await this.loadProductDetails(list.map(item => item.id));

    return {
      total,
      page,
      pageSize,
      list: list.map(item => this.buildProductCard(item, details)),
    };
  }

  async appPage(query, userId?: number) {
    const { page, pageSize } = this.getPageParams(query);
    const keyWord = String(query?.keyWord || '').trim();
    const qb = this.productEntity
      .createQueryBuilder('p')
      .innerJoin(
        WudongProductCategoryEntity,
        'c',
        'c.id = p.categoryId and c.deleted = 0 and c.status = 1'
      )
      .where('p.deleted = :deleted', { deleted: 0 })
      .andWhere('p.status = :status', { status: 1 });

    if (keyWord) {
      qb.andWhere('(p.title like :keyWord or p.subtitle like :keyWord)', {
        keyWord: `%${keyWord}%`,
      });
    }

    if (query?.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }

    qb.orderBy('p.sortOrder', 'ASC')
      .addOrderBy('p.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    const details = await this.loadProductDetails(
      list.map(item => item.id),
      userId
    );

    return {
      total,
      page,
      pageSize,
      list: list.map(item => this.buildProductCard(item, details, false)),
    };
  }

  async adminInfo(id: number) {
    const product = await this.productEntity.findOneBy({
      id: Number(id),
      deleted: 0,
    });

    if (!product) {
      throw new CoolCommException('商品不存在');
    }

    const details = await this.loadProductDetails([product.id]);
    return {
      ...this.buildProductCard(product, details),
      skus: details.skuMap.get(product.id) || [],
      images: details.imageMap.get(product.id) || [],
    };
  }

  async appInfo(id: number, userId?: number) {
    const product = await this.productEntity.findOneBy({
      id: Number(id),
      deleted: 0,
      status: 1,
    });

    if (!product) {
      throw new CoolCommException('商品不存在或未上架');
    }

    const details = await this.loadProductDetails([product.id], userId);
    const category = details.categoryMap.get(product.categoryId);
    if (!category || category.deleted !== 0 || category.status !== 1) {
      throw new CoolCommException('商品不存在或未上架');
    }

    return {
      ...this.buildProductCard(product, details, false),
      category,
      images: details.imageMap.get(product.id) || [],
      skus: (details.skuMap.get(product.id) || []).filter(
        item => item.deleted === 0 && item.status === 1
      ),
      craftIntro: product.craftIntro,
      inheritorName: product.inheritorName,
      inheritorIntro: product.inheritorIntro,
      description: product.description,
    };
  }

  async save(param) {
    const id = Number(param?.id) || undefined;
    const title = String(param?.title || '').trim();
    const categoryId = Number(param?.categoryId);
    if (!title) {
      throw new CoolCommException('商品标题不能为空');
    }
    if (!categoryId) {
      throw new CoolCommException('商品分类不能为空');
    }

    const nextStatus = this.normalizeStatus(param?.status, 0);
    const category = await this.getCategory(categoryId, nextStatus === 1);
    const skus = param?.skus === undefined ? undefined : this.normalizeSkus(param.skus);
    const images =
      param?.images === undefined ? undefined : this.normalizeImages(param.images);

    return await this.getOrmManager().transaction(async manager => {
      const productRepo = manager.getRepository(WudongProductEntity);
      const product = id
        ? await productRepo.findOneBy({ id, deleted: 0 })
        : productRepo.create();

      if (id && !product) {
        throw new CoolCommException('商品不存在');
      }

      const draft = {
        ...product,
        categoryId,
        title,
        subtitle: param?.subtitle ? String(param.subtitle).trim() : null,
        description: param?.description ? String(param.description).trim() : null,
        craftIntro: param?.craftIntro ? String(param.craftIntro).trim() : null,
        inheritorName: param?.inheritorName
          ? String(param.inheritorName).trim()
          : null,
        inheritorIntro: param?.inheritorIntro
          ? String(param.inheritorIntro).trim()
          : null,
        status: nextStatus,
        sortOrder: Number(param?.sortOrder ?? product?.sortOrder ?? 0),
        deleted: 0,
      };

      const saved = await productRepo.save({
        ...draft,
        minPrice: Number(product?.minPrice ?? 0),
        maxPrice: Number(product?.maxPrice ?? 0),
      });

      if (skus !== undefined) {
        await this.syncSkus(saved.id, skus, manager);
      }

      if (images !== undefined) {
        await this.syncImages(saved.id, images, manager);
      }

      const finalSkus = await manager.getRepository(WudongProductSkuEntity).find({
        where: {
          productId: saved.id,
          deleted: 0,
        },
      });
      const finalImages = await manager.getRepository(WudongProductImageEntity).find({
        where: {
          productId: saved.id,
          deleted: 0,
        },
      });

      if (saved.status === 1) {
        await this.validateBeforePublish(saved, category, finalSkus, finalImages);
      }

      const priceRange = this.calcPriceRange(finalSkus);
      await productRepo.save({
        ...saved,
        minPrice: priceRange.minPrice,
        maxPrice: priceRange.maxPrice,
      });

      return { id: saved.id };
    });
  }

  async setStatus(id: number, status: number) {
    const product = await this.productEntity.findOneBy({
      id: Number(id),
      deleted: 0,
    });

    if (!product) {
      throw new CoolCommException('商品不存在');
    }

    const nextStatus = this.normalizeStatus(status, 0);
    if (nextStatus === 1) {
      const [category, skus, images] = await Promise.all([
        this.getCategory(product.categoryId, true),
        this.productSkuEntity.find({
          where: {
            productId: product.id,
            deleted: 0,
          },
        }),
        this.productImageEntity.find({
          where: {
            productId: product.id,
            deleted: 0,
          },
        }),
      ]);
      await this.validateBeforePublish(product, category, skus, images);
    }

    await this.productEntity.save({
      ...product,
      status: nextStatus,
    });
  }

  async delete(ids: string | number[] | number) {
    const idList = this.parseIdList(ids);
    if (!idList.length) {
      throw new CoolCommException('请选择要删除的商品');
    }

    await this.getOrmManager().transaction(async manager => {
      await Promise.all([
        manager
          .createQueryBuilder()
          .update(WudongProductEntity)
          .set({
            deleted: 1,
            status: 0,
            updateTime: new Date() as any,
          })
          .where('id in (:...ids)', { ids: idList })
          .execute(),
        manager
          .createQueryBuilder()
          .update(WudongProductSkuEntity)
          .set({
            deleted: 1,
            updateTime: new Date() as any,
          })
          .where('productId in (:...ids)', { ids: idList })
          .execute(),
        manager
          .createQueryBuilder()
          .update(WudongProductImageEntity)
          .set({
            deleted: 1,
            updateTime: new Date() as any,
          })
          .where('productId in (:...ids)', { ids: idList })
          .execute(),
      ]);
    });
  }
}
