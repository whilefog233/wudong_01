import { useEffect, useState } from 'react';
import type { FormProps } from 'antd';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  AuditOutlined,
  LogoutOutlined,
  NotificationOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  deleteCategory,
  deleteProduct,
  fetchCategoryPage,
  fetchProductInfo,
  fetchProductPage,
  loginAdmin,
  saveCategory,
  saveProduct,
  updateCategoryStatus,
  updateProductStatus,
  type Category,
  type Product,
  type ProductImage,
  type ProductSku,
} from './api';

const { Header, Sider, Content } = Layout;
const TOKEN_KEY = 'wudong-admin-token';

type PanelKey = 'dashboard' | 'category' | 'product' | 'operations';

type CategoryFormValues = {
  id?: number;
  name: string;
  sortOrder: number;
  status: number;
  remark?: string;
};

type ProductFormValues = {
  id?: number;
  categoryId: number;
  title: string;
  subtitle?: string;
  description?: string;
  craftIntro?: string;
  inheritorName?: string;
  inheritorIntro?: string;
  status: number;
  sortOrder: number;
  skus: ProductSku[];
  images: ProductImage[];
};

type MockOrder = {
  id: string;
  buyer: string;
  itemSummary: string;
  amount: number;
  status: '待支付' | '待发货' | '已发货';
  merchant: string;
};

type MockApplication = {
  id: string;
  shopName: string;
  owner: string;
  businessType: string;
  contact: string;
  status: '待审核' | '补充资料';
};

type MockRecommendation = {
  slot: string;
  title: string;
  target: string;
  status: '启用中' | '待替换';
};

const ORDER_BOARD: MockOrder[] = [
  {
    id: 'WD-20260628-01',
    buyer: '阿苗',
    itemSummary: '苗银手镯 · 中号',
    amount: 399,
    status: '待支付',
    merchant: '乌东银饰坊',
  },
  {
    id: 'WD-20260628-02',
    buyer: '小绣',
    itemSummary: '蜡染披肩 · 靛蓝纹样',
    amount: 268,
    status: '待发货',
    merchant: '乌东蜡染工坊',
  },
  {
    id: 'WD-20260628-03',
    buyer: '阿秋',
    itemSummary: '刺绣胸针 · 节庆系列',
    amount: 159,
    status: '已发货',
    merchant: '苗绣生活馆',
  },
];

const MERCHANT_APPLICATIONS: MockApplication[] = [
  {
    id: 'AP-01',
    shopName: '银匠旧作',
    owner: '杨阿银',
    businessType: '非遗手工坊',
    contact: '13700000001',
    status: '待审核',
  },
  {
    id: 'AP-02',
    shopName: '山风蜡染',
    owner: '潘阿蓝',
    businessType: '蜡染服饰',
    contact: '13700000002',
    status: '补充资料',
  },
];

const RECOMMENDATION_SLOTS: MockRecommendation[] = [
  {
    slot: '首页主 Banner',
    title: '苗银节庆系列专场',
    target: '商品详情 / 银饰专题页',
    status: '启用中',
  },
  {
    slot: '首页精选非遗',
    title: '夏季蜡染穿搭推荐',
    target: '分类列表 / 蜡染',
    status: '待替换',
  },
];

function getDefaultSku(): ProductSku {
  return {
    name: '默认规格',
    salePrice: 0,
    originalPrice: 0,
    stock: 0,
    status: 1,
  };
}

function getDefaultImage(isMain = 1): ProductImage {
  return {
    url: '',
    isMain,
    sortOrder: 0,
  };
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [activePanel, setActivePanel] = useState<PanelKey>('dashboard');
  const [loginLoading, setLoginLoading] = useState(false);

  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryData, setCategoryData] = useState<Category[]>([]);
  const [categoryKeyword, setCategoryKeyword] = useState('');
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [productLoading, setProductLoading] = useState(false);
  const [productData, setProductData] = useState<Product[]>([]);
  const [productKeyword, setProductKeyword] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<number | undefined>();
  const [productStatusFilter, setProductStatusFilter] = useState<number | undefined>();
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const [loginForm] = Form.useForm();
  const [categoryForm] = Form.useForm<CategoryFormValues>();
  const [productForm] = Form.useForm<ProductFormValues>();

  const previewImages = ((Form.useWatch('images', productForm) ?? []) as ProductImage[]).filter(
    item => item?.url?.trim(),
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      void Promise.all([loadCategories(), loadProducts()]);
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  async function loadCategories() {
    if (!token) {
      return;
    }
    setCategoryLoading(true);
    try {
      const page = await fetchCategoryPage(token, {
        page: 1,
        pageSize: 100,
        keyWord: categoryKeyword || undefined,
      });
      setCategoryData(page.list);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类加载失败');
    } finally {
      setCategoryLoading(false);
    }
  }

  async function loadProducts() {
    if (!token) {
      return;
    }
    setProductLoading(true);
    try {
      const page = await fetchProductPage(token, {
        page: 1,
        pageSize: 100,
        keyWord: productKeyword || undefined,
        categoryId: productCategoryFilter,
        status: productStatusFilter,
      });
      setProductData(page.list);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品加载失败');
    } finally {
      setProductLoading(false);
    }
  }

  const handleLogin: FormProps['onFinish'] = async values => {
    setLoginLoading(true);
    try {
      const result = await loginAdmin({
        username: values.username,
        password: values.password,
      });
      setToken(result.token);
      message.success('已进入乌东“衣”模块后台');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  function openCategoryForm(record?: Category) {
    setEditingCategory(record ?? null);
    categoryForm.setFieldsValue(
      record
        ? {
            id: record.id,
            name: record.name,
            sortOrder: record.sortOrder,
            status: record.status,
            remark: record.remark ?? '',
          }
        : {
            name: '',
            sortOrder: 0,
            status: 1,
            remark: '',
          },
    );
    setCategoryFormOpen(true);
  }

  async function submitCategory(values: CategoryFormValues) {
    if (!token) {
      return;
    }
    try {
      await saveCategory(token, values);
      message.success(values.id ? '分类已更新' : '分类已创建');
      setCategoryFormOpen(false);
      await loadCategories();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类保存失败');
    }
  }

  async function toggleCategory(record: Category, checked: boolean) {
    if (!token) {
      return;
    }
    try {
      await updateCategoryStatus(token, record.id, checked ? 1 : 0);
      message.success('分类状态已更新');
      await Promise.all([loadCategories(), loadProducts()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类状态更新失败');
    }
  }

  async function removeCategory(record: Category) {
    if (!token) {
      return;
    }
    try {
      await deleteCategory(token, [record.id]);
      message.success('分类已删除');
      await Promise.all([loadCategories(), loadProducts()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类删除失败');
    }
  }

  async function openProductForm(record?: Product) {
    if (!record) {
      setEditingProductId(null);
      productForm.setFieldsValue({
        categoryId: undefined as never,
        title: '',
        subtitle: '',
        description: '',
        craftIntro: '',
        inheritorName: '',
        inheritorIntro: '',
        status: 0,
        sortOrder: 0,
        skus: [getDefaultSku()],
        images: [getDefaultImage(1)],
      });
      setProductFormOpen(true);
      return;
    }

    if (!token) {
      return;
    }
    try {
      const detail = await fetchProductInfo(token, record.id);
      setEditingProductId(detail.id);
      productForm.setFieldsValue({
        id: detail.id,
        categoryId: detail.categoryId,
        title: detail.title,
        subtitle: detail.subtitle ?? '',
        description: detail.description ?? '',
        craftIntro: detail.craftIntro ?? '',
        inheritorName: detail.inheritorName ?? '',
        inheritorIntro: detail.inheritorIntro ?? '',
        status: detail.status,
        sortOrder: detail.sortOrder ?? 0,
        skus: detail.skus?.length ? detail.skus : [getDefaultSku()],
        images: detail.images?.length ? detail.images : [getDefaultImage(1)],
      });
      setProductFormOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品详情加载失败');
    }
  }

  async function submitProduct(values: ProductFormValues) {
    if (!token) {
      return;
    }
    try {
      await saveProduct(token, {
        ...values,
        skus: values.skus.map((item, index) => ({
          ...item,
          sortOrder: item.sortOrder ?? index,
        })),
        images: values.images.map((item, index) => ({
          ...item,
          sortOrder: item.sortOrder ?? index,
        })),
      });
      message.success(values.id ? '商品已更新' : '商品已创建');
      setProductFormOpen(false);
      await loadProducts();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品保存失败');
    }
  }

  async function toggleProduct(record: Product, checked: boolean) {
    if (!token) {
      return;
    }
    try {
      await updateProductStatus(token, record.id, checked ? 1 : 0);
      message.success(checked ? '商品已上架' : '商品已下架');
      await loadProducts();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品状态更新失败');
    }
  }

  async function removeProduct(record: Product) {
    if (!token) {
      return;
    }
    try {
      await deleteProduct(token, [record.id]);
      message.success('商品已删除');
      await loadProducts();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品删除失败');
    }
  }

  function logout() {
    setToken(null);
    loginForm.resetFields();
    message.success('已退出后台');
  }

  const categoryOptions = categoryData.map(item => ({
    label: item.name,
    value: item.id,
  }));

  const categoryColumns: ColumnsType<Category> = [
    { title: 'ID', dataIndex: 'id', width: 72 },
    { title: '分类名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sortOrder', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => (
        <Switch checked={record.status === 1} onChange={checked => void toggleCategory(record, checked)} />
      ),
    },
    { title: '备注', dataIndex: 'remark' },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openCategoryForm(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除这个分类吗？" onConfirm={() => void removeCategory(record)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const productColumns: ColumnsType<Product> = [
    { title: 'ID', dataIndex: 'id', width: 72 },
    {
      title: '主图',
      dataIndex: 'coverImage',
      width: 100,
      render: value =>
        value ? <Image src={value} width={68} height={52} preview={false} style={{ objectFit: 'cover', borderRadius: 10 }} /> : '-',
    },
    { title: '商品标题', dataIndex: 'title', width: 180 },
    { title: '分类', dataIndex: 'categoryName', width: 120 },
    {
      title: '数据',
      width: 160,
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag color="blue">{`SKU ${record.skuCount ?? 0}`}</Tag>
          <Tag>{`图片 ${record.imageCount ?? 0}`}</Tag>
        </Space>
      ),
    },
    {
      title: '价格区间',
      width: 150,
      render: (_, record) => `¥${Number(record.minPrice).toFixed(2)} - ¥${Number(record.maxPrice).toFixed(2)}`,
    },
    { title: '库存', dataIndex: 'totalStock', width: 90 },
    {
      title: '售卖状态',
      dataIndex: 'soldOut',
      width: 110,
      render: value => (value ? <Tag color="red">售罄</Tag> : <Tag color="green">可售</Tag>),
    },
    {
      title: '上架',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => (
        <Switch checked={record.status === 1} onChange={checked => void toggleProduct(record, checked)} />
      ),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => void openProductForm(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除这个商品吗？" onConfirm={() => void removeProduct(record)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!token) {
    return (
      <div className="login-shell">
        <Card className="login-panel" variant="borderless">
          <Typography.Text className="eyebrow">WUDONG ADMIN</Typography.Text>
          <Typography.Title level={2}>乌东文旅“衣”模块后台</Typography.Title>
          <Typography.Paragraph>
            这里负责非遗商品、分类、订单看板、推荐位和入驻审核的统一管理。当前保留真实商品接口，并补齐运营视角的演示面板。
          </Typography.Paragraph>
          <Form
            layout="vertical"
            form={loginForm}
            onFinish={handleLogin}
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginLoading}>
              登录后台
            </Button>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <Layout className="admin-shell">
      <Sider width={260} className="admin-sider">
        <div className="brand-block">
          <Typography.Text className="eyebrow">WUDONG HERITAGE</Typography.Text>
          <Typography.Title level={3}>衣模块运营后台</Typography.Title>
          <Typography.Paragraph>
            围绕非遗商品的内容、商品、订单与商家入驻做统一运营。
          </Typography.Paragraph>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activePanel]}
          onClick={({ key }) => setActivePanel(key as PanelKey)}
          items={[
            { key: 'dashboard', icon: <AppstoreOutlined />, label: '运营概览' },
            { key: 'category', icon: <ShopOutlined />, label: '分类管理' },
            { key: 'product', icon: <ShoppingOutlined />, label: '商品管理' },
            { key: 'operations', icon: <AuditOutlined />, label: '订单与运营' },
          ]}
        />
      </Sider>

      <Layout>
        <Header className="admin-header">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {activePanel === 'dashboard' && '运营概览'}
              {activePanel === 'category' && '分类管理'}
              {activePanel === 'product' && '商品管理'}
              {activePanel === 'operations' && '订单与运营'}
            </Typography.Title>
            <Typography.Text type="secondary">
              当前先把“衣”模块做深，支付暂缓，其它运营能力先按演示链路补齐。
            </Typography.Text>
          </div>

          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void Promise.all([loadCategories(), loadProducts()])}
            >
              刷新数据
            </Button>
            {activePanel === 'category' ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCategoryForm()}>
                新增分类
              </Button>
            ) : null}
            {activePanel === 'product' ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => void openProductForm()}>
                新增商品
              </Button>
            ) : null}
            <Button icon={<LogoutOutlined />} onClick={logout}>
              退出
            </Button>
          </Space>
        </Header>

        <Content className="admin-content">
          {activePanel === 'dashboard' ? (
            <div className="dashboard-stack">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12} xl={6}>
                  <Card className="metric-card">
                    <Statistic title="在售商品" value={productData.filter(item => item.status === 1).length} />
                  </Card>
                </Col>
                <Col xs={24} md={12} xl={6}>
                  <Card className="metric-card">
                    <Statistic title="分类数量" value={categoryData.length} />
                  </Card>
                </Col>
                <Col xs={24} md={12} xl={6}>
                  <Card className="metric-card">
                    <Statistic title="待审核入驻" value={MERCHANT_APPLICATIONS.filter(item => item.status === '待审核').length} />
                  </Card>
                </Col>
                <Col xs={24} md={12} xl={6}>
                  <Card className="metric-card">
                    <Statistic title="今日订单看板" value={ORDER_BOARD.length} />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} xl={14}>
                  <Card title="衣模块运营提示" className="content-card">
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="当前重点">
                        商品、分类、工艺故事、订单占位、推荐位与商家入驻审核
                      </Descriptions.Item>
                      <Descriptions.Item label="支付模块">
                        暂不接入，仅保留“待支付”状态和订单流转占位
                      </Descriptions.Item>
                      <Descriptions.Item label="视觉规范">
                        后台与前台统一使用苗银蓝 #1F5FA8 与苗绣橙 #E85D2F 作为主辅色
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} xl={10}>
                  <Card title="推荐位状态" className="content-card">
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      {RECOMMENDATION_SLOTS.map(item => (
                        <div className="recommend-row" key={item.slot}>
                          <div>
                            <Typography.Text strong>{item.slot}</Typography.Text>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              {item.title}
                            </Typography.Paragraph>
                          </div>
                          <Tag color={item.status === '启用中' ? 'blue' : 'orange'}>{item.status}</Tag>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          ) : null}

          {activePanel === 'category' ? (
            <Card title="非遗商品分类" className="content-card">
              <Space className="toolbar">
                <Input.Search
                  allowClear
                  placeholder="搜索分类名称"
                  value={categoryKeyword}
                  onChange={event => setCategoryKeyword(event.target.value)}
                  onSearch={() => void loadCategories()}
                  style={{ width: 280 }}
                />
              </Space>
              <Table rowKey="id" loading={categoryLoading} dataSource={categoryData} columns={categoryColumns} pagination={false} />
            </Card>
          ) : null}

          {activePanel === 'product' ? (
            <Card title="非遗商品管理" className="content-card">
              <Space className="toolbar" wrap>
                <Input.Search
                  allowClear
                  placeholder="搜索标题 / 副标题 / 传承人"
                  value={productKeyword}
                  onChange={event => setProductKeyword(event.target.value)}
                  onSearch={() => void loadProducts()}
                  style={{ width: 320 }}
                />
                <Select
                  allowClear
                  placeholder="分类筛选"
                  style={{ width: 180 }}
                  value={productCategoryFilter}
                  onChange={value => setProductCategoryFilter(value)}
                  options={categoryOptions}
                />
                <Select
                  allowClear
                  placeholder="状态筛选"
                  style={{ width: 160 }}
                  value={productStatusFilter}
                  onChange={value => setProductStatusFilter(value)}
                  options={[
                    { label: '已下架', value: 0 },
                    { label: '已上架', value: 1 },
                  ]}
                />
                <Button type="primary" onClick={() => void loadProducts()}>
                  应用筛选
                </Button>
              </Space>
              <Table
                rowKey="id"
                loading={productLoading}
                dataSource={productData}
                columns={productColumns}
                pagination={false}
                scroll={{ x: 1280 }}
              />
            </Card>
          ) : null}

          {activePanel === 'operations' ? (
            <div className="dashboard-stack">
              <Row gutter={[16, 16]}>
                <Col xs={24} xl={14}>
                  <Card title="订单看板" className="content-card">
                    <Table
                      rowKey="id"
                      pagination={false}
                      dataSource={ORDER_BOARD}
                      columns={[
                        { title: '订单号', dataIndex: 'id' },
                        { title: '买家', dataIndex: 'buyer' },
                        { title: '商品摘要', dataIndex: 'itemSummary' },
                        { title: '商家', dataIndex: 'merchant' },
                        {
                          title: '金额',
                          dataIndex: 'amount',
                          render: value => `¥${Number(value).toFixed(2)}`,
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          render: value => (
                            <Badge
                              status={
                                value === '待支付' ? 'warning' : value === '待发货' ? 'processing' : 'success'
                              }
                              text={value}
                            />
                          ),
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} xl={10}>
                  <Card title="商家入驻审核" className="content-card">
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      {MERCHANT_APPLICATIONS.map(item => (
                        <div className="application-row" key={item.id}>
                          <div>
                            <Typography.Text strong>{item.shopName}</Typography.Text>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              {item.owner} · {item.businessType} · {item.contact}
                            </Typography.Paragraph>
                          </div>
                          <Tag color={item.status === '待审核' ? 'orange' : 'gold'}>{item.status}</Tag>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
              </Row>

              <Card title="轮播与推荐位" className="content-card">
                <Table
                  rowKey="slot"
                  pagination={false}
                  dataSource={RECOMMENDATION_SLOTS}
                  columns={[
                    { title: '位置', dataIndex: 'slot' },
                    { title: '当前内容', dataIndex: 'title' },
                    { title: '跳转目标', dataIndex: 'target' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: value => <Tag color={value === '启用中' ? 'blue' : 'orange'}>{value}</Tag>,
                    },
                    {
                      title: '操作',
                      render: () => (
                        <Space>
                          <Button size="small">替换内容</Button>
                          <Button size="small" icon={<NotificationOutlined />}>
                            推送
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            </div>
          ) : null}
        </Content>
      </Layout>

      <Modal
        open={categoryFormOpen}
        title={editingCategory ? '编辑分类' : '新增分类'}
        onCancel={() => setCategoryFormOpen(false)}
        onOk={() => categoryForm.submit()}
      >
        <Form layout="vertical" form={categoryForm} onFinish={submitCategory}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="排序" name="sortOrder" rules={[{ required: true, message: '请输入排序值' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select
                  options={[
                    { label: '启用', value: 1 },
                    { label: '停用', value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={productFormOpen}
        width={920}
        title={editingProductId ? '编辑商品' : '新增商品'}
        onClose={() => setProductFormOpen(false)}
        extra={
          <Button type="primary" onClick={() => productForm.submit()}>
            保存商品
          </Button>
        }
      >
        <Form layout="vertical" form={productForm} onFinish={submitProduct}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="商品标题" name="title" rules={[{ required: true, message: '请输入商品标题' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="商品分类" name="categoryId" rules={[{ required: true, message: '请选择商品分类' }]}>
                <Select options={categoryOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="副标题" name="subtitle">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select
                  options={[
                    { label: '下架', value: 0 },
                    { label: '上架', value: 1 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="排序" name="sortOrder" rules={[{ required: true, message: '请输入排序值' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="商品说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="工艺介绍" name="craftIntro">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="传承人姓名" name="inheritorName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="传承人介绍" name="inheritorIntro">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="skus">
            {(fields, { add, remove }) => (
              <Card title="SKU 列表" extra={<Button onClick={() => add(getDefaultSku())}>新增 SKU</Button>}>
                {fields.map(field => (
                  <Row gutter={12} key={field.key} align="middle">
                    <Col span={7}>
                      <Form.Item
                        label="名称"
                        name={[field.name, 'name']}
                        rules={[{ required: true, message: '请输入 SKU 名称' }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="售价"
                        name={[field.name, 'salePrice']}
                        rules={[{ required: true, message: '请输入售价' }]}
                      >
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="原价"
                        name={[field.name, 'originalPrice']}
                        rules={[{ required: true, message: '请输入原价' }]}
                      >
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="库存"
                        name={[field.name, 'stock']}
                        rules={[{ required: true, message: '请输入库存' }]}
                      >
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item
                        label="状态"
                        name={[field.name, 'status']}
                        rules={[{ required: true, message: '请选择状态' }]}
                      >
                        <Select
                          options={[
                            { label: '启用', value: 1 },
                            { label: '停用', value: 0 },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button danger onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    </Col>
                    <Form.Item name={[field.name, 'id']} hidden>
                      <Input />
                    </Form.Item>
                  </Row>
                ))}
              </Card>
            )}
          </Form.List>

          <Form.List name="images">
            {(fields, { add, remove }) => (
              <Card
                title="商品图片"
                style={{ marginTop: 16 }}
                extra={<Button onClick={() => add(getDefaultImage(0))}>新增图片</Button>}
              >
                {previewImages.length ? (
                  <Space wrap style={{ marginBottom: 16 }}>
                    {previewImages.map((item, index) => (
                      <div key={`${item.id ?? 'new'}-${index}`} style={{ width: 120 }}>
                        <Image
                          src={item.url}
                          width={120}
                          height={90}
                          preview={false}
                          style={{ objectFit: 'cover', borderRadius: 10 }}
                        />
                        <div style={{ marginTop: 8 }}>
                          <Tag color={item.isMain === 1 ? 'blue' : 'default'}>
                            {item.isMain === 1 ? '主图' : `图片 ${index + 1}`}
                          </Tag>
                        </div>
                      </div>
                    ))}
                  </Space>
                ) : null}

                {fields.map(field => (
                  <Row gutter={12} key={field.key} align="middle">
                    <Col span={16}>
                      <Form.Item
                        label="图片 URL"
                        name={[field.name, 'url']}
                        rules={[{ required: true, message: '请输入图片地址' }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="主图"
                        name={[field.name, 'isMain']}
                        rules={[{ required: true, message: '请选择是否主图' }]}
                      >
                        <Select
                          options={[
                            { label: '是', value: 1 },
                            { label: '否', value: 0 },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item label="排序" name={[field.name, 'sortOrder']}>
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button danger onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    </Col>
                    <Form.Item name={[field.name, 'id']} hidden>
                      <Input />
                    </Form.Item>
                  </Row>
                ))}
              </Card>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </Layout>
  );
}

export default App;
