(function() {
    'use strict';

    window.DS = window.DS || {};

    DS.EXAMPLE_CONFIG = {
        apiProfiles: [
            {
                name: 'ZenMux GPT-5 示例',
                url: 'https://zenmux.ai/api/v1',
                key: '',
                model: 'openai/gpt-5',
                provider: 'openai'
            },
            {
                name: 'ZenMux Claude 示例',
                url: 'https://zenmux.ai/api/v1',
                key: '',
                model: 'anthropic/claude-sonnet-5-free',
                provider: 'openai'
            },
            {
                name: '智谱 GLM-4-Flash 示例',
                url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                key: '',
                model: 'glm-4-flash',
                provider: 'openai'
            },
            {
                name: '硅基流动 Qwen 示例',
                url: 'https://api.siliconflow.cn/v1/chat/completions',
                key: '',
                model: 'Qwen/Qwen3-8B',
                provider: 'openai'
            },
            {
                name: 'OpenAI 示例',
                url: 'https://api.openai.com/v1/chat/completions',
                key: '',
                model: 'gpt-4o-mini',
                provider: 'openai'
            },
            {
                name: 'Google Gemini 示例',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/',
                key: '',
                model: 'gemini-1.5-flash',
                provider: 'gemini'
            }
        ],

        searchSettings: {
            tavilyKeys: [''],
            dataSources: {
                openFda: { enabled: true, accessKey: '' },
                clinicalTrials: { enabled: true }
            },
            searchMode: 'fast',
            searchRole: '你是药物研发信息分析助手，面向立项、临床、CMC、注册和药物警戒工作。请基于可追溯的监管、说明书、试验登记和同行评议证据回答问题。',
            deepSearchInstruction: '先识别有效成分（INN/通用名）、商品名、公司与目标问题；审批报告和制剂处方检索应使用这三类名称交叉核验。将监管文件、说明书、试验登记、论文和聚合站信息严格区分，并注明不确定性。',
            sourcePriorityRules: '一级：监管机构批准/审评文件、官方说明书、药典；二级：ClinicalTrials.gov/ChiCTR、指南、同行评议论文；三级：企业官网、行业媒体和聚合站。有效成分优先，商品名和公司用于消歧；可用剂型、规格、粒度、毒性、杂质、辅料等词提高检索粒度。',
            sourcePriorityDomains: {
                tier1: [
                    'fda.gov', 'ema.europa.eu', 'nmpa.gov.cn', 'cmde.org.cn', 'pmda.go.jp', 'tga.gov.au',
                    'health.ec.europa.eu', 'swissmedic.ch', 'clinicaltrials.gov', 'chinadrugtrials.org.cn',
                    'chictr.org.cn', 'beijing.gov.cn'
                ],
                tier2: [
                    'onlinelibrary.wiley.com', 'adisinsight.springer.com', 'jaad.org',
                    'jcosmetmed.org', 'mattioli1885journals.com', 'cmain.org.cn'
                ],
                tier3: [
                    'galderma.com', 'galdermaaesthetics.com.cn', 'pharmtech.com', 'medtechdive.com',
                    'vbdata.cn', 'yaozh.com', 'pharmcube.com', 'ymguancha.com', 'medbelove.com', 'zhixie.info'
                ]
            },
            defaultAnswerTemplate: '按“检索对象与范围 + 关键结论 + 证据与来源 + 不确定性/风险 + 建议下一步”组织；标注地区、文件版本/日期和证据类型。',
            customSearchProfiles: [
                {
                    name: '药品审批与审评报告',
                    enabled: true,
                    description: '来自自建 Google 自定义搜索的审批报告站点。优先用有效成分（INN/通用名）检索，并用商品名和公司名称交叉确认；可组合剂型、规格、毒性、杂质、assessment report、PAR、interview form 等限定词。仅将监管或官方文件作为批准事实的依据。',
                    domains: 'boletin.anmat.gob.ar\ndb.cbg-meb.nl\nmri.cts-mrp.eu\ndocetp.mpa.se\nema.europa.eu\ntga.gov.au\naccessdata.fda.gov\npmda.go.jp\ninfo.pmda.go.jp\nmhraproducts4853.blob.core.windows.net\nogyei.gov.hu\nmedical.kyowakirin.co.jp\nwww2.astrazeneca.co.jp\nwww.pfizermedicalinformation.jp\na-connect.abbvie.co.jp\npharma-navi.bayer.jp\nwww.drugfuture.com'
                },
                {
                    name: '制剂处方与辅料',
                    enabled: true,
                    description: '来自自建 Google 自定义搜索的制剂处方站点。用有效成分、商品名和公司检索并交叉确认；优先 Vidal.ru 与 ANMAT。俄语/西语辅助词：Вспомогательные вещества、Fórmula、composicion、anmat。重点提取活性成分、剂型规格、辅料/包衣和来源地区；不得把推测内容当作处方事实。',
                    domains: 'boletin.anmat.gob.ar\nboletin.anmat.gov.ar\nnedrug.mfds.go.kr\nmedicines.org.uk\ninfo.pmda.go.jp\ndailymed.nlm.nih.gov\nanmat.gov.ar\nvidal.ru'
                },
                {
                    name: '自定义域名搜索 1',
                    enabled: true,
                    description: '',
                    domains: ''
                },
                {
                    name: '自定义域名搜索 2',
                    enabled: true,
                    description: '',
                    domains: ''
                }
            ]
        }
    };

})();
