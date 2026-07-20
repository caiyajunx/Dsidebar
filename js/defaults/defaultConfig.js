(function() {
    'use strict';

    window.DS = window.DS || {};

    const timestamp = Date.now();

    DS.DEFAULT_CONFIG = {
        schemaVersion: '2.0',
        apiProfiles: [
            {
                id: `profile_custom_${timestamp}`,
                name: '自定义 API',
                url: '',
                key: '',
                model: '',
                provider: 'openai'
            }
        ],

        activeTranslateProfileId: null,
        activeChatProfileId: null,
        activeSearchProfileId: null,

        translationPrompt: {
            domain: '医疗器械/药品/化妆品研发领域',
            audience: '研发、法规、注册相关人员',
            context: '专业内容阅读和交流',
            tone: '专业、准确、克制'
        },

        targetLanguage: '中文',
        maxHistoryItems: 50,

        vocabularies: [],
        activeVocabularyId: null,

        searchSettings: {
            tavilyKeys: [''],
            dataSources: {
                openFda: { enabled: true, accessKey: '' },
                clinicalTrials: { enabled: true }
            },
            searchMode: 'fast',
            searchRole: '你是药物研发信息分析助手。请基于可追溯的监管、说明书、临床试验登记和同行评议证据回答问题，不将检索线索当作已证实事实。',
            deepSearchInstruction: '先识别药物的有效成分（INN/通用名）、商品名、申办方或持证公司及目标问题。对于审批、制剂、毒性、杂质、临床和法规问题，分别检索对应的一手资料；区分监管事实、说明书信息、试验登记、文献结论与待核实线索。',
            sourcePriorityRules: '优先级：监管机构批准/审评文件、官方说明书和药典；其次临床试验登记、指南、同行评议论文；最后企业官网、行业媒体和聚合站。药品检索优先以有效成分（INN/通用名）检索，并用商品名、公司、剂型、规格、毒性、杂质等限定词交叉核对。',
            sourcePriorityDomains: {
                tier1: ['fda.gov', 'ema.europa.eu', 'nmpa.gov.cn', 'cde.org.cn', 'who.int', 'ich.org', 'clinicaltrials.gov'],
                tier2: ['pubmed.ncbi.nlm.nih.gov', 'pmc.ncbi.nlm.nih.gov', 'nature.com', 'sciencedirect.com', 'wiley.com', 'springer.com'],
                tier3: []
            },
            defaultAnswerTemplate: '按“检索对象与范围 + 关键结论 + 证据与来源 + 不确定性/风险 + 建议下一步”组织；涉及批准、处方或安全性时注明适用地区、版本/日期和证据类型。',
            customSearchProfiles: [
                {
                    name: '药物研发基础来源',
                    enabled: true,
                    description: '用于药物研发、注册法规、临床开发和药学资料的基础检索。优先查询监管机构、临床试验登记库和 PubMed；用有效成分、商品名和公司名称交叉确认。',
                    domains: 'fda.gov\nema.europa.eu\nnmpa.gov.cn\ncde.org.cn\nich.org\nwho.int\nclinicaltrials.gov\nchinadrugtrials.org.cn\npubmed.ncbi.nlm.nih.gov\npmc.ncbi.nlm.nih.gov'
                }
            ]
        },

        enableFloatingTranslateButton: false,
        hideTranslateBtnDomains: 'feishu.cn,feishu.com,notion.so,docs.google.com,workflowy.com',

        customTools: [
            {
                id: (timestamp + 2).toString(),
                name: 'Aminer',
                url: 'https://www.aminer.cn/'
            }
        ],

        menuVisibility: {
            bohrium: true,
            aily: true,
            ima: true,
            wenda: true,
            kimi: true,
            doubao: true,
            prompts: true
        },

        uiMode: 'rail'
    };

    DS.DEFAULT_PROMPTS = {
        '立项与靶点': [{ title: '靶点与竞争格局', content: '请围绕【靶点/疾病】开展药物研发立项桌面研究。\n\n输出：1. 靶点生物学与已验证机制；2. 已上市和在研项目（有效成分、商品名、公司、研发阶段）；3. 差异化机会与主要失败风险；4. 需进一步核实的一手资料。\n\n要求：区分监管/临床登记事实、文献推断与市场线索；为关键结论附来源链接或检索式。' }],
        '竞品与管线': [{ title: '竞品管线地图', content: '请以【有效成分/商品名/公司/适应症】为中心绘制竞品与管线地图。\n\n字段包括：作用机制、适应症、地区、最高研发阶段、关键试验、申办方、近期里程碑、差异化标签和信息日期。\n\n同一药物请用有效成分（INN/通用名）、商品名和公司交叉核验；无法核验的内容标为“待确认”。' }],
        '临床开发': [{ title: '临床试验方案要点', content: '请针对【药物/适应症/开发阶段】梳理临床开发证据与方案设计要点。\n\n请覆盖：目标人群、入排标准、对照与给药方案、主要/次要终点、统计与样本量线索、安全性监测、竞品试验和地区差异。\n\n优先使用 ClinicalTrials.gov、ChiCTR、监管指南和已发表结果；试验登记状态不等同于疗效结论。' }],
        'CMC与药学': [{ title: '制剂处方与辅料检索', content: '请检索【有效成分/商品名/公司/剂型或规格】的制剂处方资料。\n\n优先查找监管说明书、审评报告、产品信息和公开处方资料；可组合关键词：剂型、规格、辅料、包衣、粒度、溶出、毒性、杂质、工艺。\n\n输出活性成分、剂型规格、辅料/包衣信息、来源地区与文件版本。俄语/西语来源可辅助使用“Вспомогательные вещества”“Fórmula”“composicion”“anmat”等关键词。不得把推测的辅料或工艺写成事实。' }],
        '注册法规': [{ title: '批准与审评资料检索', content: '请围绕【有效成分/商品名/公司】检索药品批准、审评报告和说明书。\n\n请按地区列出申请/批准信息、适应症、剂型规格、关键审评结论、监管限制和原始文件链接。\n\n检索时按问题加入限定词，例如：剂型、毒性、杂质、说明书、assessment report、PAR、interview form。仅以官方或监管来源确认批准事实。' }],
        '药物警戒': [{ title: '安全性证据梳理', content: '请针对【有效成分/商品名】梳理安全性证据。\n\n分别总结标签警告/禁忌、不良反应、临床试验安全性、上市后信号、召回或短缺信息，并标注证据来源、时间范围与局限性。\n\n注意：自发报告不能推断发生率或因果关系；本输出仅用于研发信息分析，不替代临床决策。' }],
        '医学写作': [{ title: '证据摘要草案', content: '请将以下药物研发资料整理为可审阅的证据摘要。\n\n输出：问题、检索范围、关键发现、证据强度、局限性、待补充资料、参考来源。\n\n保持事实与解释分离；不补造数据、试验结果或监管结论。\n\n资料：\n[在此粘贴内容]' }],
        '文献解读': [{ title: '论文批判性解读', content: '请批判性解读以下药物研发论文或报告。\n\n请提取：研究问题、设计、样本/模型、干预与对照、终点、主要结果、偏倚与局限、可外推性，以及对研发决策的启示。\n\n区分作者结论与原始数据能够支持的结论。\n\n原文：\n[在此粘贴内容]' }]
    };

})();
