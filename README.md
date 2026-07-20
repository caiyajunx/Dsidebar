# DSider 药物研发助手 V2.0

DSider 是一个 Manifest V3 Chrome 侧边栏扩展，提供翻译、对话、循证搜索、Prompt 管理及本地配置管理。V2.0 面向药物研发工作：预置立项、临床、CMC、注册、药物警戒和文献解读 Prompt，并提供药品审批资料与制剂处方的搜索画像。

## 安装与首次配置

1. 在 Chrome 扩展程序页面开启开发者模式，并加载本目录。
2. 打开 DSider 的“设置”。
3. 选择“导入配置”导入自己的私有 JSON 配置，或手动填写 API URL、模型名称和 API Key。
4. 对自定义 API URL 点击“授权当前地址”。
5. 需要网页检索时，在“搜索设置”填写自己的 Tavily API Key；如不填写，仍可使用 OpenFDA 和 ClinicalTrials.gov 的公开数据检索。

所有 API Key 仅保存在 Chrome 本地存储或用户自行导入/导出的私有 JSON 文件中。仓库内的默认与示例配置不含真实 Key。

## 私有配置

“导出配置”会生成 `dsider_private_settings_YYYY-MM-DD.json`，其中可能含 API Key。请妥善保管，不要上传到 GitHub；该文件名已被 `.gitignore` 排除。

导入配置会覆盖当前本地设置，仅应导入来自可信来源的文件。公开示例配置仅导入 URL、模型、搜索画像和空 Key。

## 药物研发搜索

建议将问题写成：有效成分（INN/通用名）+ 商品名 + 公司 + 目标维度。例如：

`奥希替尼（Osimertinib / 泰瑞沙 / AstraZeneca）80 mg 片剂辅料与批准说明书`

对于审批报告，可再加入“剂型、规格、毒性、杂质、assessment report、PAR、interview form”等限定词。对于制剂处方，俄语/西语来源可配合 `Вспомогательные вещества`、`Fórmula`、`composicion`、`anmat` 检索。

预置的两个站点画像分别用于：

- 药品审批与审评报告：优先用有效成分，再以商品名与公司交叉核验；批准事实只以监管/官方文件确认。
- 制剂处方与辅料：优先 Vidal.ru 与 ANMAT，并核对活性成分、剂型规格、辅料/包衣、地区和文件版本。

## 公开数据源

- OpenFDA：药品标签、批准、召回等公开 FDA 数据。默认无须 Key；可以在设置中填写可选 access key 提高公开 API 限额。
- ClinicalTrials.gov：临床试验登记公开 API，无须 Key。

公开数据只能用作研发信息检索。试验登记状态不等同于疗效结论；自发不良事件报告不能推断发生率或因果关系。本扩展不提供诊疗建议。

## 开源发布检查

发布前应扫描真实密钥、私有配置和导出文件；新增 API 服务商时只能添加空 Key 示例，并检查所需的 host permissions。
