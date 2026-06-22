/**
 * 智能匹配引擎
 * 基于多维度加权评分算法，计算学生与岗位的匹配度
 */

class MatchingEngine {
  constructor() {
    // 匹配维度权重
    this.dimensionWeights = {
      skills: 0.35,       // 技能匹配度 - 最重要
      education: 0.15,    // 学历匹配
      major: 0.15,        // 专业匹配
      direction: 0.15,    // 方向匹配（职业兴趣）
      experience: 0.10,   // 经验匹配
      city: 0.05,         // 城市匹配
      salary: 0.05        // 薪资匹配
    };
  }

  /**
   * 主匹配函数：计算学生与岗位的综合匹配度
   * @param {Object} userProfile - 学生画像
   * @param {Object} job - 岗位信息
   * @returns {Object} 匹配结果（总分 + 各维度分数）
   */
  calculateMatch(userProfile, job) {
    const scores = {
      skills: this._calcSkillMatch(userProfile.skills, job),
      education: this._calcEducationMatch(userProfile.education, job),
      major: this._calcMajorMatch(userProfile.major, job),
      direction: this._calcDirectionMatch(userProfile.interests, job),
      experience: this._calcExperienceMatch(userProfile.experience, job),
      city: this._calcCityMatch(userProfile.city, job),
      salary: this._calcSalaryMatch(userProfile.salaryMin, userProfile.salaryMax, job)
    };

    // 加权总分
    let totalScore = 0;
    for (const [dim, score] of Object.entries(scores)) {
      totalScore += score * this.dimensionWeights[dim];
    }

    return {
      totalScore: Math.round(totalScore * 100),
      scores: scores,
      details: this._generateMatchDetails(userProfile, job, scores)
    };
  }

  /**
   * 技能匹配度计算
   * 核心算法：计算学生技能集合与岗位需求技能的加权重叠度
   */
  _calcSkillMatch(userSkills, job) {
    if (!userSkills || userSkills.length === 0) return 0;

    let weightedMatch = 0;
    let totalWeight = 0;

    for (const [skill, weight] of Object.entries(job.skillWeights)) {
      totalWeight += weight;
      if (userSkills.some(us => this._skillSimilarity(us, skill) > 0.7)) {
        weightedMatch += weight;
      }
    }

    return totalWeight > 0 ? weightedMatch / totalWeight : 0;
  }

  /**
   * 技能相似度计算（处理别名和变体）
   */
  _skillSimilarity(skill1, skill2) {
    const s1 = skill1.toLowerCase().trim();
    const s2 = skill2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    // 别名映射
    const aliases = {
      'js': 'javascript', 'ts': 'typescript',
      'react': 'react', 'reactjs': 'react',
      'vue': 'vue.js', 'vuejs': 'vue.js',
      'node': 'node.js', 'nodejs': 'node.js',
      'ml': '机器学习', 'machine learning': '机器学习',
      'dl': '深度学习', 'deep learning': '深度学习',
      'ai': '人工智能', 'artificial intelligence': '人工智能',
    };

    const a1 = aliases[s1] || s1;
    const a2 = aliases[s2] || s2;

    if (a1 === a2) return 0.9;

    // 包含关系
    if (s1.includes(s2) || s2.includes(s1)) return 0.75;

    // 字符串相似度（简化版Jaccard）
    const words1 = new Set(s1.split(/[\s\-_.]+/));
    const words2 = new Set(s2.split(/[\s\-_.]+/));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.length / union.size : 0;
  }

  /**
   * 学历匹配
   */
  _calcEducationMatch(userEdu, job) {
    const eduLevel = { '大专': 1, '本科': 2, '硕士': 3, '博士': 4 };
    const userLevel = eduLevel[userEdu] || 0;
    const jobLevel = eduLevel[job.education] || 2;

    if (userLevel === 0) return 0.3; // 未知学历给基础分
    if (userLevel >= jobLevel) return 1.0;
    if (userLevel === jobLevel - 1) return 0.6;
    return 0.3;
  }

  /**
   * 专业匹配
   */
  _calcMajorMatch(userMajor, job) {
    if (!userMajor || !job.preferredMajors) return 0.5;

    const um = userMajor.toLowerCase();
    for (const pm of job.preferredMajors) {
      if (um.includes(pm.toLowerCase()) || pm.toLowerCase().includes(um)) {
        return 1.0;
      }
    }

    // 模糊匹配
    const keywords = ['计算机', '软件', '信息', '电子', '数学', '统计', '数据', '设计', '管理'];
    for (const kw of keywords) {
      if (um.includes(kw)) {
        const pmText = job.preferredMajors.join(' ').toLowerCase();
        if (pmText.includes(kw)) return 0.7;
      }
    }

    return 0.3;
  }

  /**
   * 方向匹配（职业兴趣）
   */
  _calcDirectionMatch(userInterests, job) {
    if (!userInterests || userInterests.length === 0) return 0.5;
    if (userInterests.includes(job.direction)) return 1.0;

    // 相关方向映射
    const directionMap = {
      '前端开发': ['全栈开发', '移动开发'],
      '后端开发': ['全栈开发'],
      '全栈开发': ['前端开发', '后端开发'],
      '数据分析': ['人工智能', '数据工程'],
      '人工智能': ['算法工程师', '数据分析'],
      '算法工程师': ['人工智能'],
      '产品经理': ['UI设计'],
    };

    const related = directionMap[job.direction] || [];
    if (userInterests.some(i => related.includes(i))) return 0.7;

    return 0.3;
  }

  /**
   * 经验匹配
   */
  _calcExperienceMatch(userExp, job) {
    if (!userExp || job.expRequired === '不限') return 0.8;
    if (job.expRequired === '不限') return 1.0;
    if (job.expRequired === '实习经验' && userExp.length > 0) return 1.0;
    if (job.expRequired === '研究经验' && userExp.length > 0) return 0.8;
    return 0.4;
  }

  /**
   * 城市匹配
   */
  _calcCityMatch(userCity, job) {
    if (!userCity) return 0.5;
    if (userCity.includes(job.city)) return 1.0;

    // 近距离城市
    const cityClusters = {
      '北京': ['北京'],
      '上海': ['上海'],
      '深圳': ['深圳', '广州'],
      '广州': ['广州', '深圳'],
      '杭州': ['杭州', '上海'],
      '成都': ['成都'],
      '南京': ['南京', '上海'],
      '武汉': ['武汉'],
      '合肥': ['合肥', '南京'],
    };

    for (const [center, cities] of Object.entries(cityClusters)) {
      if (cities.includes(job.city) && userCity.includes(center)) return 0.7;
    }

    return 0.3;
  }

  /**
   * 薪资匹配
   */
  _calcSalaryMatch(salaryMin, salaryMax, job) {
    if (!salaryMin && !salaryMax) return 0.5;

    const jobSalaryStr = job.salary;
    const match = jobSalaryStr.match(/(\d+)K-(\d+)K/);
    if (!match) return 0.5;

    const jobMin = parseInt(match[1]) * 1000;
    const jobMax = parseInt(match[2]) * 1000;
    const userMin = salaryMin || 0;
    const userMax = salaryMax || Infinity;

    if (userMin <= jobMax && userMax >= jobMin) return 1.0;
    if (userMax < jobMin) return 0.3;
    return 0.5;
  }

  /**
   * 生成匹配详情说明
   */
  _generateMatchDetails(userProfile, job, scores) {
    const details = [];

    // 技能匹配详情
    const matchedSkills = job.skills.filter(js =>
      userProfile.skills && userProfile.skills.some(us => this._skillSimilarity(us, js) > 0.7)
    );
    const missingSkills = job.skills.filter(js =>
      !matchedSkills.includes(js)
    );

    details.push({
      dimension: '技能匹配',
      score: Math.round(scores.skills * 100),
      analysis: matchedSkills.length > 0
        ? `你掌握的 ${matchedSkills.join('、')} 与岗位需求高度匹配。`
        : '你的技能与岗位需求匹配度较低，建议补充相关技能。',
      matched: matchedSkills,
      missing: missingSkills
    });

    details.push({
      dimension: '学历匹配',
      score: Math.round(scores.education * 100),
      analysis: scores.education >= 0.8
        ? `你的学历 "${userProfile.education || '未填写'}" 满足岗位 "${job.education}" 的要求。`
        : `岗位要求 ${job.education}，你的学历可能不够，但实际要求因公司而异。`
    });

    details.push({
      dimension: '专业匹配',
      score: Math.round(scores.major * 100),
      analysis: scores.major >= 0.7
        ? `你的专业 "${userProfile.major || '未填写'}" 与岗位偏好专业高度相关。`
        : `你的专业可能不是最对口的方向，但相关技能可以弥补。`
    });

    details.push({
      dimension: '方向匹配',
      score: Math.round(scores.direction * 100),
      analysis: scores.direction >= 0.7
        ? `岗位方向 "${job.direction}" 与你的职业兴趣高度一致。`
        : `该岗位方向可能不是你最感兴趣的，但可以作为职业发展跳板。`
    });

    return details;
  }

  /**
   * 批量匹配：对学生推荐最匹配的岗位
   * @param {Object} userProfile - 学生画像
   * @param {Array} jobs - 岗位列表
   * @param {Object} options - 过滤选项
   * @returns {Array} 排序后的匹配结果
   */
  batchMatch(userProfile, jobs, options = {}) {
    const results = [];

    for (const job of jobs) {
      // 方向过滤
      if (options.direction && options.direction !== 'all' && job.direction !== options.direction) {
        continue;
      }

      const match = this.calculateMatch(userProfile, job);

      // 阈值过滤
      if (options.threshold && match.totalScore < options.threshold) {
        continue;
      }

      results.push({
        job,
        ...match
      });
    }

    // 按总分降序排列
    results.sort((a, b) => b.totalScore - a.totalScore);

    return results;
  }
}
