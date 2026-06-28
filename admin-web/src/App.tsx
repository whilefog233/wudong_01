import { useEffect, useState } from 'react';
import type { FormProps } from 'antd';
import {
  Button,
  Card,
  Col,
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
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
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

function getDefaultSku(): ProductSku {
  return {
    name: '默认款',
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
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY) ?? 'local-dev-bypass'
  );
  const [activePanel, setActivePanel] = useState<'category' | 'product'>(
    'category'
  );
  const [loginLoading, setLoginLoading] = useState(false);

  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryData, setCategoryData] = useState<Category[]>([]);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryKeyword, setCategoryKeyword] = useState('');

  const [productLoading, setProductLoading] = useState(false);
  const [productData, setProductData] = useState<Product[]>([]);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productKeyword, setProductKeyword] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<
    number | undefined
  >();
  const [productStatusFilter, setProductStatusFilter] = useState<
    number | undefined
  >();

  const [loginForm] = Form.useForm();
  const [categoryForm] = Form.useForm<CategoryFormValues>();
  const [productForm] = Form.useForm<ProductFormValues>();
  const previewImages = (
    (Form.useWatch('images', productForm) ?? []) as ProductImage[]
  ).filter(item => item?.url?.trim());

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      void loadCategories();
      void loadProducts();
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  async function loadCategories() {
    if (!token) return;
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
    if (!token) return;
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
      setToken(result.token || 'local-dev-bypass');
      message.success('登录成功');
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
          }
    );
    setCategoryFormOpen(true);
  }

  async function submitCategory(values: CategoryFormValues) {
    if (!token) return;
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
    if (!token) return;
    try {
      await updateCategoryStatus(token, record.id, checked ? 1 : 0);
      message.success('分类状态已更新');
      await Promise.all([loadCategories(), loadProducts()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分类状态更新失败');
    }
  }

  async function removeCategory(record: Category) {
    if (!token) return;
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

    if (!token) return;
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
    if (!token) return;
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
    if (!token) return;
    try {
      await updateProductStatus(token, record.id, checked ? 1 : 0);
      message.success(checked ? '商品已上架' : '商品已下架');
      await loadProducts();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品状态更新失败');
    }
  }

  async function removeProduct(record: Product) {
    if (!token) return;
    try {
      await deleteProduct(token, [record.id]);
      message.success('商品已删除');
      await loadProducts();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '商品删除失败');
    }
  }

  function triggerProductSearch() {
    window.setTimeout(() => {
      void loadProducts();
    }, 0);
  }

  function logout() {
    setToken('local-dev-bypass');
    loginForm.resetFields();
    message.success('已退出后台');
  }

  const categoryOptions = categoryData.map(item => ({
    label: item.name,
    value: item.id,
  }));

  if (!token) {
    return (
      <div className="login-shell">
        <Card className="login-panel" variant="borderless">
          <Typography.Text className="eyebrow">WUDONG ADMIN</Typography.Text>
          <Typography.Title level={2}>乌东非遗商品后台</Typography.Title>
          <Typography.Paragraph>
            直接使用管理员账号登录，重点保留商品、图片、SKU 和分类这些基础管理能力。
          </Typography.Paragraph>
          <Form
            layout="vertical"
            form={loginForm}
            onFinish={handleLogin}
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
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
      <Sider width={240} className="admin-sider">
        <div className="brand-block">
          <Typography.Text className="eyebrow">WUDONG</Typography.Text>
          <Typography.Title level={3}>商品管理</Typography.Title>
          <Typography.Paragraph style={{ color: '#fff4ea', marginBottom: 0 }}>
            基础录入、上下架、图片与 SKU 管理
          </Typography.Paragraph>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activePanel]}
          onClick={({ key }) => setActivePanel(key as 'category' | 'product')}
          items={[
            {
              key: 'category',
              icon: <AppstoreOutlined />,
              label: '商品分类',
            },
            {
              key: 'product',
              icon: <ShoppingOutlined />,
              label: '商品管理',
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header className="admin-header">
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() =>
                void (activePanel === 'category' ? loadCategories() : loadProducts())
              }
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                void (activePanel === 'category'
                  ? openCategoryForm()
                  : openProductForm())
              }
            >
              {activePanel === 'category' ? '新增分类' : '新增商品'}
            </Button>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            退出登录
          </Button>
        </Header>

        <Content className="admin-content">
          {activePanel === 'category' ? (
            <Card title="分类管理" className="content-card">
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
              <Table
                rowKey="id"
                loading={categoryLoading}
                dataSource={categoryData}
                pagination={false}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  { title: '分类名称', dataIndex: 'name' },
                  { title: '排序', dataIndex: 'sortOrder', width: 100 },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 120,
                    render: (_, record) => (
                      <Switch
                        checked={record.status === 1}
                        onChange={checked => void toggleCategory(record, checked)}
                      />
                    ),
                  },
                  { title: '备注', dataIndex: 'remark' },
                  {
                    title: '操作',
                    width: 180,
                    render: (_, record) => (
                      <Space>
                        <Button
                          size="small"
                          onClick={() => openCategoryForm(record)}
                        >
                          编辑
                        </Button>
                        <Popconfirm
                          title="确认删除这个分类吗？"
                          onConfirm={() => void removeCategory(record)}
                        >
                          <Button size="small" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          ) : (
            <Card title="商品管理" className="content-card">
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
                  onChange={value => {
                    setProductCategoryFilter(value);
                    triggerProductSearch();
                  }}
                  options={categoryOptions}
                />
                <Select
                  allowClear
                  placeholder="状态筛选"
                  style={{ width: 160 }}
                  value={productStatusFilter}
                  onChange={value => {
                    setProductStatusFilter(value);
                    triggerProductSearch();
                  }}
                  options={[
                    { label: '已下架', value: 0 },
                    { label: '已上架', value: 1 },
                  ]}
                />
              </Space>
              <Table
                rowKey="id"
                loading={productLoading}
                dataSource={productData}
                pagination={false}
                scroll={{ x: 1280 }}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  {
                    title: '封面',
                    dataIndex: 'coverImage',
                    width: 110,
                    render: value =>
                      value ? (
                        <Image
                          src={value}
                          width={72}
                          height={54}
                          preview={false}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        '-'
                      ),
                  },
                  { title: '标题', dataIndex: 'title', width: 180 },
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
                    width: 160,
                    render: (_, record) =>
                      `¥${Number(record.minPrice).toFixed(2)} - ¥${Number(
                        record.maxPrice
                      ).toFixed(2)}`,
                  },
                  { title: '库存', dataIndex: 'totalStock', width: 100 },
                  {
                    title: '售卖状态',
                    dataIndex: 'soldOut',
                    width: 110,
                    render: value =>
                      value ? (
                        <Tag color="red">售罄</Tag>
                      ) : (
                        <Tag color="green">可售</Tag>
                      ),
                  },
                  {
                    title: '上架',
                    dataIndex: 'status',
                    width: 100,
                    render: (_, record) => (
                      <Switch
                        checked={record.status === 1}
                        onChange={checked => void toggleProduct(record, checked)}
                      />
                    ),
                  },
                  {
                    title: '操作',
                    fixed: 'right',
                    width: 180,
                    render: (_, record) => (
                      <Space>
                        <Button
                          size="small"
                          onClick={() => void openProductForm(record)}
                        >
                          编辑
                        </Button>
                        <Popconfirm
                          title="确认删除这个商品吗？"
                          onConfirm={() => void removeProduct(record)}
                        >
                          <Button size="small" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          )}
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
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="排序"
                name="sortOrder"
                rules={[{ required: true, message: '请输入排序值' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
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
          </Row>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={productFormOpen}
        width={860}
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
              <Form.Item
                label="商品标题"
                name="title"
                rules={[{ required: true, message: '请输入商品标题' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="商品分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择商品分类' }]}
              >
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
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select
                  options={[
                    { label: '下架', value: 0 },
                    { label: '上架', value: 1 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="排序"
                name="sortOrder"
                rules={[{ required: true, message: '请输入排序值' }]}
              >
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
              <Card
                title="SKU 列表"
                extra={
                  <Button onClick={() => add(getDefaultSku())}>添加 SKU</Button>
                }
              >
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
                        <InputNumber
                          min={0}
                          precision={2}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="原价"
                        name={[field.name, 'originalPrice']}
                        rules={[{ required: true, message: '请输入原价' }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        label="库存"
                        name={[field.name, 'stock']}
                        rules={[{ required: true, message: '请输入库存' }]}
                      >
                        <InputNumber
                          min={0}
                          precision={0}
                          style={{ width: '100%' }}
                        />
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
                extra={
                  <Button onClick={() => add(getDefaultImage(0))}>添加图片</Button>
                }
              >
                {previewImages.length ? (
                  <Space wrap style={{ marginBottom: 16 }}>
                    {previewImages.map((item, index) => (
                      <div
                        key={`${item.id ?? 'new'}-${index}`}
                        style={{ width: 120 }}
                      >
                        <Image
                          src={item.url}
                          width={120}
                          height={90}
                          preview={false}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                        />
                        <div style={{ marginTop: 8 }}>
                          <Tag color={item.isMain === 1 ? 'green' : 'default'}>
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
                        <InputNumber
                          min={0}
                          precision={0}
                          style={{ width: '100%' }}
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
        </Form>
      </Drawer>
    </Layout>
  );
}

export default App;
