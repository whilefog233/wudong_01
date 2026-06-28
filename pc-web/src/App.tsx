import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  addFavorite,
  fetchCategories,
  fetchFavoritePage,
  fetchProductDetail,
  fetchProducts,
  loginWithPassword,
  removeFavorite,
  type Category,
  type FavoriteItem,
  type ProductCard,
  type ProductDetail,
  type ProductSku,
} from './api';
import {
  clearCartItems,
  prependOrder,
  readAddresses,
  readCart,
  readOrders,
  readProfile,
  removeCartItem,
  updateCartQuantity,
  upsertCartItem,
  type CartItem,
  type OrderRecord,
} from './localState';

const DEMO_PHONE = '13800000000';
const DEMO_PASSWORD = '123456';
const TOKEN_KEY = 'wudong-pc-token';
const FALLBACK_ASSET_BASE = 'http://127.0.0.1:3000/heritage-products';

const HERO_IMAGES = [
  `${FALLBACK_ASSET_BASE}/miaoxiu-jacket/01.jpg`,
  `${FALLBACK_ASSET_BASE}/silver-bracelet/01.jpg`,
  `${FALLBACK_ASSET_BASE}/zharan-dress/01.jpg`,
];

const CULTURE_POINTS = [
  {
    title: '银饰锻造',
    body: '把苗银冷色光泽转成现代穿搭里的高光细节，让作品既能佩戴，也能讲述出处。',
  },
  {
    title: '蜡染纹样',
    body: '将靛蓝、留白与几何纹路带进数字界面，让浏览时也保留山野与手作的呼吸感。',
  },
  {
    title: '传承人故事',
    body: '每件单品都把工艺介绍、传承人口述和使用场景放在同一页里完整展开。',
  },
];

const HOT_SEARCHES = ['苗银手镯', '蜡染披肩', '刺绣胸针', '节庆服饰'];

function priceLabel(minPrice: number, maxPrice: number) {
  if (Number(minPrice) === Number(maxPrice)) {
    return `¥${Number(minPrice).toFixed(2)}`;
  }
  return `¥${Number(minPrice).toFixed(2)} - ¥${Number(maxPrice).toFixed(2)}`;
}

function resolveSkuSpecs(specs: ProductSku['specs']) {
  if (Array.isArray(specs)) {
    const values = specs.map(item => String(item).trim()).filter(Boolean);
    return values.length ? values.join(' / ') : '标准规格';
  }
  if (typeof specs === 'string' && specs.trim()) {
    return specs.trim();
  }
  return '标准规格';
}

function firstAvailableSku(detail: ProductDetail) {
  return detail.skus.find(sku => sku.status === 1 && Number(sku.stock) > 0) ?? detail.skus[0];
}

function buildCartItem(detail: ProductDetail, sku: ProductSku): CartItem {
  return {
    productId: detail.id,
    skuId: sku.id,
    title: detail.title,
    subtitle: detail.subtitle,
    categoryName: detail.categoryName,
    coverImage: detail.coverImage || detail.images[0]?.url || HERO_IMAGES[0],
    skuName: sku.name,
    skuSpecs: resolveSkuSpecs(sku.specs),
    unitPrice: Number(sku.salePrice),
    quantity: 1,
    stock: Number(sku.stock),
  };
}

function buildOrder(items: CartItem[]): OrderRecord {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return {
    id: `WD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
    items,
    totalQuantity,
    totalAmount,
  };
}

function readCartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

function routeMeta(pathname: string) {
  if (pathname.startsWith('/products/')) {
    return {
      title: '单品详情',
      headline: '一件作品的工艺、传承与规格，在同一页里被完整展开。',
    };
  }

  if (pathname.startsWith('/cart')) {
    return {
      title: '购物车',
      headline: '把想带走的苗寨器物先收拢，再统一提交订单。',
    };
  }

  if (pathname.startsWith('/account')) {
    return {
      title: '个人中心',
      headline: '收藏、订单、地址与非遗偏好，都汇集在你的个人展签里。',
    };
  }

  if (pathname.startsWith('/favorites')) {
    return {
      title: '我的收藏',
      headline: '把喜欢的银饰、蜡染与刺绣慢慢积累成自己的选品墙。',
    };
  }

  return {
    title: '非遗商品馆',
    headline: '围绕“衣”做深：让苗银、蜡染、刺绣与节庆服饰被更好地浏览、理解与带走。',
  };
}

function App() {
  const location = useLocation();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const [cartVersion, setCartVersion] = useState(0);
  const [orderVersion, setOrderVersion] = useState(0);

  const meta = routeMeta(location.pathname);
  const cartCount = readCartCount();

  useEffect(() => {
    document.title = `乌东文旅 · ${meta.title}`;
  }, [meta.title]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const result = await loginWithPassword(phone, password);
      setToken(result.token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败，请稍后重试。');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
  }

  return (
    <div className="app-shell">
      <div className="page-noise page-noise-one" />
      <div className="page-noise page-noise-two" />

      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-kicker">WUDONG HERITAGE</span>
          <span className="brand-name">乌东文旅 · 衣</span>
        </Link>

        <nav className="site-nav">
          <Link className={location.pathname === '/' ? 'nav-link active' : 'nav-link'} to="/">
            首页
          </Link>
          <Link
            className={location.pathname.startsWith('/favorites') ? 'nav-link active' : 'nav-link'}
            to="/favorites"
          >
            收藏
          </Link>
          <Link
            className={location.pathname.startsWith('/cart') ? 'nav-link active' : 'nav-link'}
            to="/cart"
          >
            购物车
            <span className="nav-badge">{cartCount}</span>
          </Link>
          <Link
            className={location.pathname.startsWith('/account') ? 'nav-link active' : 'nav-link'}
            to="/account"
          >
            我的
          </Link>
        </nav>

        <div className="status-cluster">
          <div className="status-pill">
            <span className="status-dot" />
            {token ? '登录中，可同步收藏与订单' : '未登录，先体验浏览与选品'}
          </div>
          {token ? (
            <button type="button" className="text-button" onClick={handleLogout}>
              退出
            </button>
          ) : null}
        </div>
      </header>

      <section className={location.pathname === '/' ? 'hero hero-home' : 'hero hero-inner'}>
        <div className="hero-copy">
          <p className="eyebrow">苗银蓝 × 苗绣橙</p>
          <h1>{meta.headline}</h1>
          <p className="hero-text">
            以贵州苗族银饰、蜡染、刺绣与服饰文化为核心，把单品浏览、工艺阅读、收藏、
            购物车与下单占位整理成一条更完整的“衣模块”前台体验。
          </p>

          <div className="hero-actions">
            <Link to="/" className="solid-button">
              浏览非遗商品
            </Link>
            <Link to="/cart" className="ghost-button">
              查看购物车
            </Link>
          </div>

          <div className="quick-tags">
            {HOT_SEARCHES.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-frame hero-frame-main">
            <img src={HERO_IMAGES[0]} alt="苗绣外套" />
          </div>
          <div className="hero-frame hero-frame-side">
            <img src={HERO_IMAGES[1]} alt="苗银饰品" />
          </div>
          <div className="hero-frame hero-frame-bottom">
            <img src={HERO_IMAGES[2]} alt="蜡染服饰" />
          </div>
          <div className="hero-caption">
            <span>CRAFT EDIT</span>
            <strong>不是普通商品陈列，而是带着文化语境的非遗选品。</strong>
          </div>
        </div>

        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-card-head">
            <div>
              <p className="eyebrow">统一账号</p>
              <h2>{token ? '已登录' : '登录后同步收藏与订单'}</h2>
            </div>
            <span className="demo-tag">13800000000 / 123456</span>
          </div>

          {!token ? (
            <>
              <label className="field">
                <span>手机号</span>
                <input value={phone} onChange={event => setPhone(event.target.value)} />
              </label>
              <label className="field">
                <span>密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </label>
              <button type="submit" className="solid-button wide" disabled={loginLoading}>
                {loginLoading ? '登录中...' : '登录并开启完整链路'}
              </button>
            </>
          ) : (
            <div className="login-success">
              <p>当前账号已开启收藏、购物车和订单本地演示链路，可继续选品与提交订单。</p>
              <div className="mini-stats">
                <div>
                  <strong>{cartCount}</strong>
                  <span>购物车件数</span>
                </div>
                <div>
                  <strong>{readOrders().length}</strong>
                  <span>订单数量</span>
                </div>
              </div>
            </div>
          )}

          {loginError ? <p className="error-text">{loginError}</p> : null}
        </form>
      </section>

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              token={token}
              favoriteVersion={favoriteVersion}
              onFavoriteChange={() => setFavoriteVersion(value => value + 1)}
              onCartChange={() => setCartVersion(value => value + 1)}
            />
          }
        />
        <Route
          path="/products/:id"
          element={
            <DetailPage
              token={token}
              onFavoriteChange={() => setFavoriteVersion(value => value + 1)}
              onCartChange={() => setCartVersion(value => value + 1)}
              onOrderChange={() => setOrderVersion(value => value + 1)}
            />
          }
        />
        <Route
          path="/favorites"
          element={
            <FavoritesPage
              token={token}
              favoriteVersion={favoriteVersion}
              onFavoriteChange={() => setFavoriteVersion(value => value + 1)}
            />
          }
        />
        <Route
          path="/cart"
          element={
            <CartPage
              token={token}
              cartVersion={cartVersion}
              onCartChange={() => setCartVersion(value => value + 1)}
              onOrderChange={() => setOrderVersion(value => value + 1)}
            />
          }
        />
        <Route
          path="/account"
          element={<AccountPage token={token} orderVersion={orderVersion} favoriteVersion={favoriteVersion} />}
        />
      </Routes>
    </div>
  );
}

function HomePage(props: {
  token: string | null;
  favoriteVersion: number;
  onFavoriteChange: () => void;
  onCartChange: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | undefined>();
  const [keyWord, setKeyWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadData(keyword = keyWord) {
    setLoading(true);
    setMessage('');
    try {
      const [categoryList, productPage] = await Promise.all([
        fetchCategories(),
        fetchProducts(
          {
            page: 1,
            pageSize: 12,
            categoryId: activeCategory,
            keyWord: keyword.trim() || undefined,
          },
          props.token,
        ),
      ]);
      setCategories(categoryList);
      setProducts(productPage.list);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '商品加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeCategory, props.favoriteVersion, props.token]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData();
  }

  async function toggleFavorite(product: ProductCard) {
    if (!props.token) {
      setMessage('请先登录后再收藏单品。');
      return;
    }

    try {
      if (product.isFavorite) {
        await removeFavorite(props.token, product.id);
      } else {
        await addFavorite(props.token, product.id);
      }
      props.onFavoriteChange();
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '收藏操作失败');
    }
  }

  async function quickAdd(product: ProductCard) {
    if (!props.token) {
      setMessage('请先登录后再加入购物车。');
      return;
    }

    try {
      const detail = await fetchProductDetail(product.id, props.token);
      const sku = firstAvailableSku(detail);
      if (!sku || Number(sku.stock) <= 0) {
        setMessage('当前单品暂无可售规格。');
        return;
      }
      upsertCartItem(buildCartItem(detail, sku));
      props.onCartChange();
      setMessage(`已将“${detail.title}”加入购物车。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加入购物车失败');
    }
  }

  const leadProduct = products[0];

  return (
    <main className="page">
      <section className="culture-strip">
        {CULTURE_POINTS.map(point => (
          <article className="culture-card" key={point.title}>
            <p className="eyebrow">{point.title}</p>
            <h3>{point.body}</h3>
          </article>
        ))}
      </section>

      <section className="catalog-shell">
        <aside className="catalog-sidebar">
          <div className="panel-block">
            <p className="eyebrow">分类检索</p>
            <h2>从工艺、服饰与使用场景开始缩小范围。</h2>
            <p className="panel-copy">以“衣”为核心，保留非遗商品完整浏览链路：分类、搜索、详情、收藏、购物车与订单占位。</p>
          </div>

          <form className="search-box" onSubmit={handleSearch}>
            <label className="field">
              <span>搜索商品</span>
              <input
                value={keyWord}
                onChange={event => setKeyWord(event.target.value)}
                placeholder="输入银饰、蜡染、刺绣、苗服等关键词"
              />
            </label>
            <button type="submit" className="solid-button wide">
              搜索非遗商品
            </button>
          </form>

          <div className="category-list">
            <button
              type="button"
              className={activeCategory === undefined ? 'category-chip active' : 'category-chip'}
              onClick={() => setActiveCategory(undefined)}
            >
              <span>全部单品</span>
              <small>查看本期全部非遗选品</small>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'category-chip active' : 'category-chip'}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.name}</span>
                <small>{category.remark || '围绕苗寨服饰工艺延展'}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="catalog-stage">
          {leadProduct ? (
            <article className="lead-product">
              <div className="lead-image">
                <img src={leadProduct.coverImage || HERO_IMAGES[0]} alt={leadProduct.title} />
              </div>
              <div className="lead-copy">
                <p className="eyebrow">本期焦点</p>
                <h2>{leadProduct.title}</h2>
                <p className="lead-subtitle">{leadProduct.subtitle || '把传统工艺放回现代穿着与日常审美里重新理解。'}</p>
                <div className="lead-meta">
                  <div>
                    <span>分类</span>
                    <strong>{leadProduct.categoryName}</strong>
                  </div>
                  <div>
                    <span>价格区间</span>
                    <strong>{priceLabel(leadProduct.minPrice, leadProduct.maxPrice)}</strong>
                  </div>
                </div>
                <div className="hero-actions">
                  <Link to={`/products/${leadProduct.id}`} className="solid-button">
                    查看单品详情
                  </Link>
                  <button type="button" className="ghost-button" onClick={() => quickAdd(leadProduct)}>
                    加入购物车
                  </button>
                </div>
              </div>
            </article>
          ) : null}

          <div className="section-head">
            <div>
              <p className="eyebrow">商品矩阵</p>
              <h2>精选银饰、蜡染、刺绣与苗族服饰。</h2>
            </div>
            <p className="panel-copy">商品详情页会继续展开工艺介绍、传承人信息、规格与收藏操作；支付先留空，但购物车与订单占位已可走通。</p>
          </div>

          {message ? <p className="message-bar">{message}</p> : null}
          {loading ? <p className="empty-block">商品加载中...</p> : null}
          {!loading && products.length === 0 ? <p className="empty-block">当前筛选条件下暂无商品。</p> : null}

          <div className="product-grid">
            {products.map(product => (
              <article className="product-card" key={product.id}>
                <div className="product-cover">
                  <img src={product.coverImage || HERO_IMAGES[0]} alt={product.title} />
                  <span className={product.soldOut ? 'product-badge muted' : 'product-badge'}>
                    {product.soldOut ? '已售罄' : '可选购'}
                  </span>
                </div>

                <div className="product-card-body">
                  <p className="eyebrow">{product.categoryName}</p>
                  <h3>{product.title}</h3>
                  <p className="product-note">{product.subtitle || '从山野纹样与苗银细节延展出的生活穿戴器物。'}</p>
                  <div className="price-row">
                    <strong>{priceLabel(product.minPrice, product.maxPrice)}</strong>
                    <span>{product.statusText || '非遗在售'}</span>
                  </div>
                  <div className="card-actions">
                    <Link to={`/products/${product.id}`} className="ghost-button">
                      详情
                    </Link>
                    <button type="button" className="ghost-button" onClick={() => quickAdd(product)}>
                      加购
                    </button>
                    <button
                      type="button"
                      className={product.isFavorite ? 'ghost-button active' : 'ghost-button'}
                      onClick={() => toggleFavorite(product)}
                    >
                      {product.isFavorite ? '已收藏' : '收藏'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function DetailPage(props: {
  token: string | null;
  onFavoriteChange: () => void;
  onCartChange: () => void;
  onOrderChange: () => void;
}) {
  const params = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);

  async function loadDetail() {
    setLoading(true);
    setMessage('');
    try {
      const data = await fetchProductDetail(Number(params.id), props.token);
      setDetail(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '详情加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [params.id, props.token]);

  useEffect(() => {
    if (detail?.images.length) {
      setSelectedImageId(detail.images[0].id);
    }
    const sku = detail ? firstAvailableSku(detail) : null;
    setSelectedSkuId(sku?.id ?? null);
  }, [detail]);

  async function toggleFavorite() {
    if (!detail) {
      return;
    }
    if (!props.token) {
      setMessage('请先登录后再收藏单品。');
      return;
    }

    try {
      if (detail.isFavorite) {
        await removeFavorite(props.token, detail.id);
      } else {
        await addFavorite(props.token, detail.id);
      }
      props.onFavoriteChange();
      await loadDetail();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '收藏失败');
    }
  }

  function addToCart() {
    if (!detail) {
      return;
    }
    if (!props.token) {
      setMessage('请先登录后再加入购物车。');
      return;
    }
    const sku = detail.skus.find(item => item.id === selectedSkuId) ?? firstAvailableSku(detail);
    if (!sku || Number(sku.stock) <= 0) {
      setMessage('当前规格暂无库存。');
      return;
    }
    upsertCartItem(buildCartItem(detail, sku));
    props.onCartChange();
    setMessage('已加入购物车，可前往购物车提交订单。');
  }

  function buyNow() {
    if (!detail) {
      return;
    }
    if (!props.token) {
      setMessage('请先登录后再下单。');
      return;
    }
    const sku = detail.skus.find(item => item.id === selectedSkuId) ?? firstAvailableSku(detail);
    if (!sku || Number(sku.stock) <= 0) {
      setMessage('当前规格暂无库存。');
      return;
    }
    const order = buildOrder([buildCartItem(detail, sku)]);
    prependOrder(order);
    props.onOrderChange();
    setMessage('订单已创建，支付模块暂未开放，当前保留待支付状态。');
  }

  if (loading) {
    return (
      <main className="page">
        <p className="empty-block">单品详情加载中...</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="page">
        <p className="message-bar">{message || '当前单品暂不可用。'}</p>
        <button type="button" className="ghost-button" onClick={() => navigate('/')}>
          返回首页
        </button>
      </main>
    );
  }

  const activeImage = detail.images.find(image => image.id === selectedImageId) ?? detail.images[0];
  const selectedSku = detail.skus.find(item => item.id === selectedSkuId) ?? firstAvailableSku(detail);

  return (
    <main className="page">
      <button type="button" className="text-button" onClick={() => navigate(-1)}>
        返回上一页
      </button>

      <section className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-image">
            <img src={activeImage?.url || detail.coverImage || HERO_IMAGES[0]} alt={detail.title} />
          </div>
          <div className="detail-thumbs">
            {detail.images.map(image => (
              <button
                key={image.id}
                type="button"
                className={selectedImageId === image.id ? 'thumb-button active' : 'thumb-button'}
                onClick={() => setSelectedImageId(image.id)}
              >
                <img src={image.url} alt={detail.title} />
              </button>
            ))}
          </div>
        </div>

        <article className="detail-panel">
          <p className="eyebrow">{detail.categoryName}</p>
          <h2>{detail.title}</h2>
          <p className="product-note">{detail.subtitle || '以穿戴器物承接苗寨工艺与现代生活的连接。'}</p>

          <div className="price-panel">
            <div>
              <span>当前售价</span>
              <strong>{selectedSku ? `¥${Number(selectedSku.salePrice).toFixed(2)}` : priceLabel(detail.minPrice, detail.maxPrice)}</strong>
            </div>
            <div>
              <span>库存状态</span>
              <strong>{selectedSku && Number(selectedSku.stock) > 0 ? `${selectedSku.stock} 件可售` : '当前售罄'}</strong>
            </div>
          </div>

          <p className="detail-description">{detail.description || '暂无额外说明。'}</p>

          <div className="sku-choice">
            <p className="eyebrow">规格选择</p>
            <div className="sku-pills">
              {detail.skus.map(sku => (
                <button
                  key={sku.id}
                  type="button"
                  className={selectedSkuId === sku.id ? 'sku-pill active' : 'sku-pill'}
                  onClick={() => setSelectedSkuId(sku.id)}
                >
                  <span>{sku.name}</span>
                  <small>{resolveSkuSpecs(sku.specs)}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="solid-button" onClick={addToCart}>
              加入购物车
            </button>
            <button type="button" className="ghost-button" onClick={buyNow}>
              立即下单
            </button>
            <button
              type="button"
              className={detail.isFavorite ? 'ghost-button active' : 'ghost-button'}
              onClick={toggleFavorite}
            >
              {detail.isFavorite ? '取消收藏' : '收藏单品'}
            </button>
          </div>

          {message ? <p className="message-bar">{message}</p> : null}

          <div className="facts-grid">
            <div>
              <span>传承人</span>
              <strong>{detail.inheritorName || '待补充'}</strong>
            </div>
            <div>
              <span>SKU 数量</span>
              <strong>{detail.skus.length}</strong>
            </div>
            <div>
              <span>浏览状态</span>
              <strong>{detail.soldOut ? '仅展示' : '可选购'}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="story-grid">
        <article className="story-card">
          <p className="eyebrow">工艺介绍</p>
          <h3>把作品的制作方式说清楚。</h3>
          <p>{detail.craftIntro || '暂无工艺介绍。'}</p>
        </article>

        <article className="story-card">
          <p className="eyebrow">传承人口述</p>
          <h3>{detail.inheritorName || '等待补充传承人信息'}</h3>
          <p>{detail.inheritorIntro || '暂无传承人介绍。'}</p>
        </article>
      </section>
    </main>
  );
}

function FavoritesPage(props: {
  token: string | null;
  favoriteVersion: number;
  onFavoriteChange: () => void;
}) {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadFavorites() {
    if (!props.token) {
      setItems([]);
      setMessage('登录后才能同步你的非遗收藏清单。');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const page = await fetchFavoritePage(props.token);
      setItems(page.list);
      if (!page.list.length) {
        setMessage('暂时还没有收藏单品，去首页挑一件喜欢的作品吧。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '收藏加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, [props.token, props.favoriteVersion]);

  async function handleRemove(productId: number) {
    if (!props.token) {
      return;
    }
    try {
      await removeFavorite(props.token, productId);
      props.onFavoriteChange();
      await loadFavorites();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '取消收藏失败');
    }
  }

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow">收藏清单</p>
          <h2>把喜欢的蜡染、银饰与刺绣慢慢累积成自己的选品墙。</h2>
        </div>
      </section>

      {loading ? <p className="empty-block">收藏加载中...</p> : null}
      {message ? <p className="message-bar">{message}</p> : null}

      <div className="favorites-grid">
        {items.map(item => (
          <article className="favorite-card" key={item.favoriteId}>
            <img src={item.coverImage || HERO_IMAGES[0]} alt={item.title} />
            <div className="favorite-body">
              <p className="eyebrow">{item.categoryName}</p>
              <h3>{item.title}</h3>
              <p className="product-note">{item.subtitle || '已加入你的非遗收藏夹。'}</p>
              <strong>{priceLabel(item.minPrice, item.maxPrice)}</strong>
              <div className="card-actions">
                <Link to={`/products/${item.productId}`} className="ghost-button">
                  查看详情
                </Link>
                <button type="button" className="ghost-button active" onClick={() => handleRemove(item.productId)}>
                  取消收藏
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function CartPage(props: {
  token: string | null;
  cartVersion: number;
  onCartChange: () => void;
  onOrderChange: () => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedSkuIds, setSelectedSkuIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const nextItems = readCart();
    setItems(nextItems);
    setSelectedSkuIds(nextItems.map(item => item.skuId));
  }, [props.cartVersion]);

  function sync(nextItems: CartItem[]) {
    setItems(nextItems);
    setSelectedSkuIds(prev => prev.filter(id => nextItems.some(item => item.skuId === id)));
    props.onCartChange();
  }

  function toggleSelect(skuId: number) {
    setSelectedSkuIds(current =>
      current.includes(skuId) ? current.filter(id => id !== skuId) : [...current, skuId],
    );
  }

  function changeQuantity(skuId: number, delta: number) {
    const target = items.find(item => item.skuId === skuId);
    if (!target) {
      return;
    }
    const nextQuantity = Math.max(0, Math.min(target.quantity + delta, target.stock));
    const nextItems = updateCartQuantity(skuId, nextQuantity);
    sync(nextItems);
  }

  function deleteItem(skuId: number) {
    sync(removeCartItem(skuId));
  }

  function createOrderFromCart() {
    if (!props.token) {
      setMessage('请先登录后再提交订单。');
      return;
    }
    const selectedItems = items.filter(item => selectedSkuIds.includes(item.skuId));
    if (!selectedItems.length) {
      setMessage('请至少勾选一件商品。');
      return;
    }
    const defaultAddress = readAddresses().find(item => item.isDefault) ?? readAddresses()[0];
    const order = buildOrder(selectedItems);
    prependOrder(order);
    clearCartItems(selectedItems.map(item => item.skuId));
    props.onCartChange();
    props.onOrderChange();
    setItems(readCart());
    setSelectedSkuIds([]);
    setMessage(`订单已提交至“待支付”，收货地址为：${defaultAddress.region}${defaultAddress.detail}。支付模块暂未开放。`);
  }

  const selectedItems = items.filter(item => selectedSkuIds.includes(item.skuId));
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow">购物车</p>
          <h2>统一购物车先承接“衣模块”，支持数量调整、删除与生成待支付订单。</h2>
        </div>
      </section>

      {message ? <p className="message-bar">{message}</p> : null}
      {!items.length ? (
        <div className="empty-card">
          <h3>购物车还是空的。</h3>
          <p>从单品详情选择规格后加入购物车，这里就会成为你的待购清单。</p>
          <button type="button" className="solid-button" onClick={() => navigate('/')}>
            去挑选商品
          </button>
        </div>
      ) : (
        <section className="cart-layout">
          <div className="cart-list">
            {items.map(item => (
              <article className="cart-item" key={item.skuId}>
                <button
                  type="button"
                  className={selectedSkuIds.includes(item.skuId) ? 'check-button active' : 'check-button'}
                  onClick={() => toggleSelect(item.skuId)}
                >
                  {selectedSkuIds.includes(item.skuId) ? '✓' : ''}
                </button>
                <img src={item.coverImage || HERO_IMAGES[0]} alt={item.title} />
                <div className="cart-copy">
                  <p className="eyebrow">{item.categoryName}</p>
                  <h3>{item.title}</h3>
                  <p className="product-note">{item.skuName} · {item.skuSpecs}</p>
                </div>
                <div className="cart-price">
                  <strong>¥{item.unitPrice.toFixed(2)}</strong>
                  <span>库存 {item.stock}</span>
                </div>
                <div className="cart-quantity">
                  <button type="button" className="qty-button" onClick={() => changeQuantity(item.skuId, -1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" className="qty-button" onClick={() => changeQuantity(item.skuId, 1)}>
                    +
                  </button>
                </div>
                <button type="button" className="text-button" onClick={() => deleteItem(item.skuId)}>
                  删除
                </button>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="eyebrow">结算摘要</p>
            <h3>支付先不做，订单先生成。</h3>
            <div className="summary-row">
              <span>已选商品</span>
              <strong>{selectedItems.length} 件</strong>
            </div>
            <div className="summary-row">
              <span>收货地址</span>
              <strong>{readAddresses()[0].receiver}</strong>
            </div>
            <div className="summary-total">
              <span>合计</span>
              <strong>¥{totalAmount.toFixed(2)}</strong>
            </div>
            <button type="button" className="solid-button wide" onClick={createOrderFromCart}>
              提交订单
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}

function AccountPage(props: { token: string | null; orderVersion: number; favoriteVersion: number }) {
  const [favoriteCount, setFavoriteCount] = useState(0);
  const profile = readProfile();
  const addresses = readAddresses();
  const orders = readOrders();

  useEffect(() => {
    async function loadFavoriteCount() {
      if (!props.token) {
        setFavoriteCount(0);
        return;
      }
      try {
        const page = await fetchFavoritePage(props.token);
        setFavoriteCount(page.list.length);
      } catch {
        setFavoriteCount(0);
      }
    }

    loadFavoriteCount();
  }, [props.token, props.favoriteVersion]);

  return (
    <main className="page">
      <section className="account-hero">
        <div className="account-card">
          <p className="eyebrow">个人资料</p>
          <h2>{profile.nickname}</h2>
          <p className="panel-copy">{profile.bio}</p>
          <div className="facts-grid">
            <div>
              <span>所在城市</span>
              <strong>{profile.city}</strong>
            </div>
            <div>
              <span>收藏数</span>
              <strong>{favoriteCount}</strong>
            </div>
            <div>
              <span>订单数</span>
              <strong>{orders.length}</strong>
            </div>
          </div>
        </div>

        <div className="account-card">
          <p className="eyebrow">默认地址</p>
          <h2>{addresses[0].receiver}</h2>
          <p className="panel-copy">{addresses[0].region}{addresses[0].detail}</p>
          <p className="product-note">{addresses[0].phone}</p>
        </div>
      </section>

      <section className="account-sections">
        <article className="account-panel">
          <p className="eyebrow">我的订单</p>
          <h3>先保留待支付占位，再接支付能力。</h3>
          {!orders.length ? (
            <p className="panel-copy">当前还没有订单记录，去商品详情页尝试“立即下单”或从购物车提交一单。</p>
          ) : (
            <div className="order-list">
              {orders.map(order => (
                <div className="order-row" key={order.id}>
                  <div>
                    <strong>{order.id}</strong>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <strong>{order.totalQuantity} 件</strong>
                    <span>¥{order.totalAmount.toFixed(2)}</span>
                  </div>
                  <span className="order-tag">{order.status === 'pending' ? '待支付' : '进行中'}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="account-panel">
          <p className="eyebrow">收货地址</p>
          <h3>衣模块配送先使用本地地址演示。</h3>
          <div className="address-list">
            {addresses.map(address => (
              <div className="address-row" key={address.id}>
                <div>
                  <strong>{address.receiver}{address.isDefault ? ' · 默认' : ''}</strong>
                  <span>{address.phone}</span>
                </div>
                <p>{address.region}{address.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="account-panel">
          <p className="eyebrow">商家入驻提示</p>
          <h3>当前前台先保留入口说明，后台再承接审核管理。</h3>
          <p className="panel-copy">
            游客可申请成为非遗手工坊商家，后续由平台管理员在后台审核资料、分配账号并完成上线。
          </p>
        </article>
      </section>
    </main>
  );
}

export default App;
