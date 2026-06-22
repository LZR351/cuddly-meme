/**
 * 简历分析器
 * 解析简历内容，提取关键信息，评估简历质量
 */

class ResumeAnalyzer {
  constructor() {
    this.dimensions = [
      { key: 'completeness', label: '完整度', weight: 0.25 },
      { key: 'skills', label: '技能表达', weight: 0.20 },
      { key: 'experience', label: '经验描述', weight: 0.20 },
      { key: 'quantification', label: '数据量化', weight: 0.15 },
      { key: 'keywords', label: '关键词', weight: 0.10 },
      { key: 'format', label: '结构与表达', weight: 0.10 }
    ];
  }

  /**
   * 分析简历内容
   */
  analyze(resumeText, targetJob = null) {
    const text = resumeText.trim();
    const result = {
      overallScore: 0,
      level: '',
      dimensionScores: {},
      extractedInfo: this._extractInfo(text),
      strengths: [],
      weaknesses: [],
      keywordHits: [],
      keywordMisses: []
    };

    const scores = {};
    scores.completeness = this._scoreCompleteness(result.extractedInfo);
    scores.skills = this._scoreSkills(text, targetJob);
    scores.experience = this._scoreExperience(text);
    scores.quantification = this._scoreQuantification(text);
    scores.keywords = this._scoreKeywords(text, targetJob);
    scores.format = this._scoreFormat(text);

    let total = 0;
    for (const dim of this.dimensions) {
      result.dimensionScores[dim.key] = {
        label: dim.label,
        score: Math.round(scores[dim.key] * 100),
        weight: dim.weight
      };
      total += scores[dim.key] * dim.weight;
    }

    result.overallScore = Math.round(total * 100);
    result.level = this._getScoreLevel(result.overallScore);
    result.strengths = this._identifyStrengths(scores);
    result.weaknesses = this._identifyWeaknesses(scores);

    if (targetJob) {
      const kw = this._analyzeKeywords(text, targetJob);
      result.keywordHits = kw.hits;
      result.keywordMisses = kw.misses;
    }

    return result;
  }

  _extractInfo(text) {
    const info = {
      name: '',
      education: '',
      school: this._extractSchool(text),
      major: this._extractMajor(text),
      skills: this._extractSkills(text),
      experience: this._extractExperienceCount(text),
      hasPhone: /1[3-9]\d{9}/.test(text),
      hasEmail: /[\w.-]+@[\w.-]+\.\w+/.test(text),
      wordCount: text.length
    };

    // 提取学历
    if (/博士/.test(text)) info.education = '博士';
    else if (/硕士|研究生/.test(text)) info.education = '硕士';
    else if (/本科|学士/.test(text)) info.education = '本科';
    else if (/大专|专科/.test(text)) info.education = '大专';

    return info;
  }

  _extractSchool(text) {
    const patterns = [
      /([\u4e00-\u9fa5]{2,8}(?:大学|学院|研究院|研究所))/,
      /(?:毕业于|学校|院校)[：:\s]*([\u4e00-\u9fa5]{2,8}(?:大学|学院))/
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1];
    }
    return '';
  }

  _extractMajor(text) {
    const patterns = [
      /(?:专业)[：:\s]*([\u4e00-\u9fa5a-zA-Z]{2,20})/,
      /([\u4e00-\u9fa5]{2,15}专业)/
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1].replace(/专业$/, '');
    }
    return '';
  }

  _extractSkills(text) {
    const found = [];
    const commonTech = [
      'JavaScript', 'TypeScript', 'Java', 'Python', 'Go', 'C++', 'C', 'Rust', 'R', 'PHP', 'Swift', 'Kotlin',
      'React', 'Vue', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'Flutter', 'React Native',
      'Spring Boot', 'Django', 'Flask', 'Express', 'FastAPI', 'Gin', 'Node.js',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite',
      'Hadoop', 'Spark', 'Hive', 'Flink', 'Kafka', 'Airflow',
      '机器学习', '深度学习', 'PyTorch', 'TensorFlow', 'NLP', '计算机视觉', '推荐系统', 'Scikit-learn', 'XGBoost', 'BERT',
      'Docker', 'Kubernetes', 'Jenkins', 'Linux', 'Git', 'Nginx',
      'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'Axure',
      'SQL', 'Excel', 'Tableau', 'PowerBI', 'Pandas', 'NumPy', '统计学',
      'Selenium', 'Appium', 'HTML5', 'CSS3', 'Webpack', 'Vite',
      '数据分析', '人工智能', '算法', '产品设计', '用户研究', 'PRD', '项目管理'
    ];

    for (const tech of commonTech) {
      if (text.includes(tech) && !found.includes(tech)) {
        found.push(tech);
      }
    }
    return found;
  }

  _extractExperienceCount(text) {
    const indicators = ['实习', '项目', '经验', '工作', '负责', '参与', '开发', '设计', '完成'];
    let count = 0;
    const sections = text.split(/\n\n|\n/);
    for (const section of sections) {
      if (indicators.some(ind => section.includes(ind)) && section.length > 30) {
        count++;
      }
    }
    return count;
  }

  _scoreCompleteness(info) {
    const checks = [
      !!info.education, !!info.school, !!info.major,
      info.skills.length >= 3, info.experience >= 1,
      info.hasPhone, info.hasEmail
    ];
    let score = checks.filter(Boolean).length / checks.length;
    if (info.wordCount > 200) score += 0.05;
    if (info.wordCount > 500) score += 0.05;
    return Math.min(1, score);
  }

  _scoreSkills(text) {
    const extracted = this._extractSkills(text);
    if (extracted.length === 0) return 0.2;
    if (extracted.length < 3) return 0.4;
    if (extracted.length < 5) return 0.6;
    if (extracted.length < 8) return 0.8;
    return 0.95;
  }

  _scoreExperience(text) {
    const count = this._extractExperienceCount(text);
    if (count === 0) return 0.2;
    const hasDetail = /负责|参与|主导|独立完成|优化|改进|设计|开发|实现|部署|上线/.test(text);
    const hasResult = /提高|降低|增加|减少|优化|提升|节省|增长|完成/.test(text);
    let score = 0.4 + Math.min(0.3, count * 0.1);
    if (hasDetail) score += 0.15;
    if (hasResult) score += 0.15;
    return Math.min(1, score);
  }

  _scoreQuantification(text) {
    const patterns = [/\d+%/, /\d+万/, /\d+亿/, /\d+k/i, /\d+次/, /\d+人/, /\d+天/, /\d+月/, /\d+个/];
    let hits = 0;
    for (const p of patterns) { if (p.test(text)) hits++; }
    if (hits === 0) return 0.2;
    if (hits <= 2) return 0.5;
    if (hits <= 4) return 0.75;
    return 0.95;
  }

  _scoreKeywords(text, targetJob) {
    if (!targetJob) return 0.5;
    const kw = this._analyzeKeywords(text, targetJob);
    const total = kw.hits.length + kw.misses.length;
    return total === 0 ? 0.5 : kw.hits.length / total;
  }

  _analyzeKeywords(text, job) {
    const hits = [];
    const misses = [];
    for (const skill of job.skills) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped, 'i').test(text)) {
        hits.push(skill);
      } else {
        misses.push(skill);
      }
    }
    return { hits, misses };
  }

  _scoreFormat(text) {
    let score = 0.5;
    const hasSections = text.includes('\n\n') || text.includes('\n');
    if (hasSections) score += 0.1;
    if (text.length > 100 && text.length < 3000) score += 0.1;
    if (!/[!！]{3,}|[?？]{3,}/.test(text)) score += 0.1;
    if (/[\u4e00-\u9fa5]/.test(text)) score += 0.1;
    return Math.min(1, score);
  }

  _getScoreLevel(score) {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fair';
    return 'poor';
  }

  _identifyStrengths(scores) {
    const strengths = [];
    if (scores.completeness >= 0.8) strengths.push('简历信息完整，包含了关键的个人信息和联系方式');
    if (scores.skills >= 0.8) strengths.push('技能展示清晰，列出了丰富的专业技能');
    if (scores.experience >= 0.8) strengths.push('经验描述详实，有具体的职责和成果说明');
    if (scores.quantification >= 0.8) strengths.push('善于使用数据和量化指标，增强了说服力');
    return strengths;
  }

  _identifyWeaknesses(scores) {
    const weaknesses = [];
    if (scores.completeness < 0.6) weaknesses.push('简历信息不够完整，建议补充缺失的关键信息');
    if (scores.skills < 0.5) weaknesses.push('技能描述不够丰富，建议详细列出掌握的技术栈');
    if (scores.experience < 0.5) weaknesses.push('经验描述偏少，建议用STAR法则补充项目/实习经历');
    if (scores.quantification < 0.5) weaknesses.push('缺乏数据支撑，建议在描述中加入量化指标');
    return weaknesses;
  }

  /**
   * 生成简历优化建议
   */
  generateOptimization(resumeAnalysis, targetJob) {
    const suggestions = [];

    // 技能匹配建议
    if (resumeAnalysis.keywordMisses.length > 0) {
      suggestions.push({
        priority: 'high',
        category: '技能补充',
        title: `补充岗位关键技能：${resumeAnalysis.keywordMisses.slice(0, 5).join('、')}`,
        body: `目标岗位 ${targetJob.title} 明确要求以下技能，但你的简历中未提及：${resumeAnalysis.keywordMisses.join('、')}。建议在技能栏中添加这些技能，并在项目经验中展示相关实践。`,
        example: `技能栏优化示例：\n<strong>修改前</strong>：掌握Java、MySQL\n<strong>修改后</strong>：掌握Java、Spring Boot、MySQL、Redis${resumeAnalysis.keywordMisses.includes('Docker') ? '、Docker' : ''}`
      });
    }

    // 经验描述建议
    if (resumeAnalysis.dimensionScores.experience.score < 70) {
      suggestions.push({
        priority: 'high',
        category: '经验优化',
        title: '用STAR法则强化项目/实习经验描述',
        body: 'STAR法则（Situation情境、Task任务、Action行动、Result结果）能让你的经验描述更有说服力。目前你的经验描述可能过于简略，建议补充具体情境、你的角色、采取的行动和最终结果。',
        example: `<strong>修改前</strong>：参与了电商系统的开发工作。\n<strong>修改后</strong>：在电商大促场景下（S），负责订单模块的接口开发（T），使用Spring Boot+Redis实现高并发下单接口（A），将下单响应时间从200ms降低至50ms，支撑了日均10万订单的处理（R）。`
      });
    }

    // 量化建议
    if (resumeAnalysis.dimensionScores.quantification.score < 60) {
      suggestions.push({
        priority: 'medium',
        category: '数据量化',
        title: '在经历描述中加入量化数据',
        body: 'HR筛选简历时非常关注数据化的成果。建议在你的项目/实习描述中增加具体的数字指标，如用户量、性能提升百分比、处理的数据量等。',
        example: `加入量化数据示例：\n<strong>修改前</strong>：优化了页面加载速度。\n<strong>修改后</strong>：通过代码拆分和懒加载优化，将页面首屏加载时间从3.2秒降低至1.1秒，<span class="new-text">提升了65%</span>，Core Web Vitals评分从60提升至95。`
      });
    }

    // 关键词建议
    if (resumeAnalysis.keywordHits.length > 0 && resumeAnalysis.keywordMisses.length > 0) {
      suggestions.push({
        priority: 'medium',
        category: '关键词优化',
        title: `突出已匹配的岗位关键词`,
        body: `你的简历中已包含岗位所需技能：${resumeAnalysis.keywordHits.join('、')}。建议将这些关键词在简历中更加醒目地呈现，例如放在技能栏顶部、在项目经验中加粗标注。`,
        example: `技能栏排列建议：将岗位核心技能放在前面，如"${resumeAnalysis.keywordHits[0]}""${resumeAnalysis.keywordHits[1] || ''}"放在技能列表最显眼的位置。`
      });
    }

    // 完整度建议
    if (resumeAnalysis.dimensionScores.completeness.score < 70) {
      suggestions.push({
        priority: 'high',
        category: '信息补充',
        title: '完善简历基础信息',
        body: '简历缺少关键信息（如联系方式、学历等），建议补充完整的姓名、电话、邮箱、学历、毕业院校和专业信息。完整的个人信息有助于HR快速联系你。',
        example: `简历头部应包含：\n姓名 | 电话 | 邮箱 | 学历 | 毕业院校 | 专业 | 求职意向`
      });
    }

    // 自我评价建议
    suggestions.push({
      priority: 'low',
      category: '自我评价',
      title: '撰写有针对性的自我评价',
      body: `针对 ${targetJob.title} 岗位，建议在简历开头写一段简短的自我评价（3-5行），突出你的核心竞争力。结合岗位描述中的关键词来组织语言。`,
      example: `自我评价示例：\n"本科毕业于XX大学计算机专业，${resumeAnalysis.keywordHits.length > 0 ? '掌握' + resumeAnalysis.keywordHits.slice(0, 3).join('、') : '具有扎实的编程基础'}，曾在XX公司实习期间${targetJob.direction.includes('前端') ? '参与大型Web项目的开发' : targetJob.direction.includes('后端') ? '设计并实现了高可用后端服务' : '独立完成了数据分析项目'}。对${targetJob.direction}方向充满热情，期望加入${targetJob.company}团队持续成长。"`
    });

    // 排序：高优先级在前
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
  }

  /**
   * 生成优化后的简历片段
   */
  generateOptimizedResume(resumeAnalysis, userProfile, targetJob) {
    const sections = [];

    // 个人信息
    sections.push({
      title: '个人信息',
      content: [
        `姓名：${userProfile.name || '张三'}`,
        `学历：${userProfile.education || '本科'}`,
        `毕业院校：${userProfile.school || userProfile.userSchool || 'XX大学'}`,
        `专业：${userProfile.major || userProfile.userMajor || '计算机科学与技术'}`,
        `电话：138-XXXX-XXXX`,
        `邮箱：example@email.com`,
        `求职意向：${targetJob.title}`
      ].join(' | ')
    });

    // 技能
    const allSkills = [...new Set([
      ...(userProfile.skills || []),
      ...resumeAnalysis.keywordHits,
      ...resumeAnalysis.keywordMisses.slice(0, 3)
    ])];
    sections.push({
      title: '专业技能',
      content: allSkills.slice(0, 10).map((s, i) => `${i < resumeAnalysis.keywordHits.length ? '<span class="resume-highlight">' : ''}${s}${i < resumeAnalysis.keywordHits.length ? '</span>' : ''}`).join('、')
    });

    // 项目经验（基于建议生成模板）
    sections.push({
      title: '项目/实习经验',
      content: `<span class="resume-highlight">XX项目</span> | ${targetJob.direction.includes('前端') ? '前端开发' : '开发'}实习生\n2024.06 - 2024.09\n<span class="resume-highlight">项目描述</span>：参与${targetJob.company}的${targetJob.direction}相关项目开发，使用${(resumeAnalysis.keywordHits || targetJob.skills).slice(0, 4).join('、')}等技术栈。\n<span class="resume-highlight">主要职责</span>：负责核心功能模块的设计与开发，与团队协作完成需求分析和方案设计。\n<span class="resume-highlight">项目成果</span>：完成XX功能的开发和上线，性能提升约<span class="resume-highlight">30%</span>，获得了导师和团队的好评。`
    });

    // 自我评价
    sections.push({
      title: '自我评价',
      content: `对${targetJob.direction}方向有浓厚兴趣和扎实基础，掌握${(userProfile.skills || resumeAnalysis.keywordHits || targetJob.skills).slice(0, 4).join('、')}等核心技术。学习能力强，具有良好的团队协作意识和问题解决能力。`
    });

    return sections;
  }
}
