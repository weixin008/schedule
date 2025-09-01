// 🎯 作者信息配置文件
// 请根据您的实际情况修改以下信息

export const authorConfig = {
  // 👤 基本信息
  name: "zhineng457",
  website: "https://github.com/weixin008",
  
  // 📱 社交媒体
  wechat: {
    publicAccount: "豆子爱分享",
    personalAccount: "zhineng457",
    description: "关注获取更多实用工具和技术分享"
  },
  
  // 🔗 开源信息 (暂时注释，项目上传GitHub后再启用)
  // github: {
  //   username: "weixin008",
  //   repository: "paiban-system",
  //   url: "https://github.com/weixin008/paiban-system"
  // },
  
  // 💰 赞赏信息
  donation: {
    enabled: true, // 是否显示赞赏码
    message: "如果这个工具对您有帮助，欢迎扫码支持一下",
    qrCodePath: "/assets/zanshang.png", // 赞赏码图片路径
    platforms: ["微信", "支付宝"] // 支持的赞赏平台
  },
  
  // 📝 项目信息
  project: {
    name: "排班管理系统",
    description: "一个简单实用的企业排班解决方案",
    version: "1.0.0",
    features: [
      "完全本地化存储，数据安全可控",
      "支持多平台：Windows、Linux、Web版本", 
      "响应式设计，支持手机和平板访问",
      "多种主题切换，界面美观易用",
      "开源免费，持续更新维护"
    ]
  },
  
  // 🔄 更新日志
  changelog: [
    {
      version: "v1.0.0",
      date: "2025-01-15",
      changes: ["初始版本发布，支持基础排班功能"],
      type: "release"
    },
    {
      version: "v1.0.0",
      date: "2025-01-15", 
      changes: ["新增Linux系统适配，支持多种安装格式"],
      type: "feature"
    },
    {
      version: "v1.0.0",
      date: "2025-01-15",
      changes: ["优化响应式设计，完善移动端体验"],
      type: "improvement"
    }
  ],
  
  // ⚠️ 免责声明
  disclaimer: `本软件为个人开发的开源项目，仅供学习和参考使用。使用过程中如遇到问题，
欢迎通过GitHub Issues或邮件反馈。开发者会尽力提供支持，但不承担任何使用风险。
如果您觉得这个工具有用，欢迎分享给更多需要的人！`,

  // 🎨 个性化设置
  branding: {
    slogan: "Made with ❤️ by {name}",
    footerText: "关注公众号「{publicAccount}」获取更多实用工具"
  }
};

// 🛠️ 辅助函数：替换模板变量
export const formatText = (template, config = authorConfig) => {
  return template
    .replace('{name}', config.name)
    .replace('{publicAccount}', config.wechat.publicAccount)
    .replace('{email}', config.email)
    .replace('{website}', config.website);
};

// 📋 使用说明：
// 1. 修改上面的配置信息为您的真实信息
// 2. 将您的赞赏码图片放到 public/assets/donation-qr.png
// 3. 如果不需要赞赏功能，将 donation.enabled 设为 false
// 4. 根据需要调整项目特色和更新日志 