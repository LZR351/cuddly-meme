/**
 * AI求职智能匹配平台 - 主应用逻辑
 */

// ==================== 全局状态 ====================
const AppState = {
  currentPage: 'dashboard',
  userProfile: {
    name: '', education: '', school: '', major: '', gradYear: '', city: '',
    skills: [], skillProficiency: {}, experience: [], interests: [],
    salaryMin: null, salaryMax: null, bio: ''
  },
  matchResults: [],
  resumeAnalysis: null,
  optimizationSuggestions: [],
  charts: {}
};

const matchingEngine = new MatchingEngine();
const resumeAnalyzer = new ResumeAnalyzer();

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initProfileForm();
  initSkillInput();
  renderSkillSuggestions();
  updateDashboard();
});

// ==================== 导航系统 ====================
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
}

function navigateTo(page) {
  AppState.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');
  const titles = { dashboard: '工作台', profile: '个人信息', matching: '智能匹配', resume: '简历分析', optimize: '简历优化' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('sidebar').classList.remove('open');
}

// ==================== 个人信息表单 ====================
function initProfileForm() {
  const form = document.getElementById('profileForm');
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); saveProfile(); });
}

function saveProfile() {
  const p = AppState.userProfile;
  p.name = document.getElementById('userName').value.trim();
  p.education = document.getElementById('userEducation').value;
  p.school = document.getElementById('userSchool').value.trim();
  p.major = document.getElementById('userMajor').value.trim();
  p.gradYear = document.getElementById('userGradYear').value;
  p.city = document.getElementById('userCity').value.trim();
  p.skills = Array.from(document.querySelectorAll('#userSkills .skill-tag')).map(t => t.dataset.skill);
  p.skillProficiency = {};
  document.querySelectorAll('.proficiency-item').forEach(item => {
    p.skillProficiency[item.dataset.skill] = parseInt(item.querySelector('.proficiency-slider').value);
  });
  p.interests = Array.from(document.querySelectorAll('input[name="interest"]:checked')).map(cb => cb.value);
  p.salaryMin = parseInt(document.getElementById('salaryMin').value) || null;
  p.salaryMax = parseInt(document.getElementById('salaryMax').value) || null;
  p.experience = collectExperience();
  p.bio = document.getElementById('userBio').value.trim();
  document.getElementById('sidebarUserName').textContent = p.name || '未登录';
  showToast('个人信息已保存，可以去智能匹配了！', 'success');
  updateDashboard();
  setTimeout(() => navigateTo('matching'), 500);
}

function collectExperience() {
  const items = [];
  document.querySelectorAll('.experience-item').forEach(item => {
    const company = item.querySelector('[name="expCompany"]')?.value?.trim() || '';
    const role = item.querySelector('[name="expRole"]')?.value?.trim() || '';
    const desc = item.querySelector('[name="expDesc"]')?.value?.trim() || '';
    if (company || role) items.push({ company, role, desc });
  });
  return items;
}

// ==================== 技能输入 ====================
function initSkillInput() {
  const input = document.getElementById('skillInput');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const skill = input.value.trim(); if (skill) addSkill(skill); }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => { document.getElementById('skillSuggestions').style.display = 'none'; }, 200);
  });
  input.addEventListener('focus', () => {
    renderSkillSuggestions();
    document.getElementById('skillSuggestions').style.display = 'flex';
  });
}

function addSkill(skill) {
  if (!skill || AppState.userProfile.skills.includes(skill)) return;
  AppState.userProfile.skills.push(skill);
  renderSkillTags();
  renderSkillProficiency();
  document.getElementById('skillInput').value = '';
}

function removeSkill(skill) {
  AppState.userProfile.skills = AppState.userProfile.skills.filter(s => s !== skill);
  renderSkillTags();
  renderSkillProficiency();
}

function renderSkillTags() {
  const container = document.getElementById('userSkills');
  container.innerHTML = AppState.userProfile.skills.map(skill =>
    `<span class="skill-tag" data-skill="${skill}">${skill}<span class="remove-tag" onclick="removeSkill('${skill}')">&times;</span></span>`
  ).join('');
}

function renderSkillSuggestions() {
  const container = document.getElementById('skillSuggestions');
  const suggested = ALL_SKILLS.filter(s => !AppState.userProfile.skills.includes(s)).slice(0, 15);
  container.innerHTML = suggested.map(s => `<span class="skill-suggestion" onclick="addSkill('${s}')">${s}</span>`).join('');
  container.style.display = 'flex';
}

function renderSkillProficiency() {
  const container = document.getElementById('skillProficiency');
  container.innerHTML = AppState.userProfile.skills.map(skill => {
    const val = AppState.userProfile.skillProficiency[skill] || 70;
    return `<div class="proficiency-item" data-skill="${skill}">
      <label>${skill}</label>
      <input type="range" class="proficiency-slider" min="0" max="100" value="${val}" oninput="this.nextElementSibling.textContent=this.value+'%'">
      <span class="proficiency-value">${val}%</span>
    </div>`;
  }).join('');
}

function addExperience() {
  const list = document.getElementById('experienceList');
  const index = list.children.length;
  const item = document.createElement('div');
  item.className = 'experience-item';
  item.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-weight:600;font-size:14px;">经验 #${index + 1}</span>
      <button type="button" class="remove-exp" onclick="this.closest('.experience-item').remove()">删除</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>公司/项目名称</label><input type="text" name="expCompany" placeholder="如：字节跳动"></div>
      <div class="form-group"><label>职位/角色</label><input type="text" name="expRole" placeholder="如：前端开发实习生"></div>
      <div class="form-group full-width"><label>工作内容</label><textarea name="expDesc" rows="3" placeholder="描述你的主要工作内容和成果..."></textarea></div>
    </div>`;
  list.appendChild(item);
}

// ==================== 智能匹配 ====================
function startMatching() {
  const profile = AppState.userProfile;
  if (!profile.name && !profile.education && profile.skills.length === 0) {
    showToast('请先完善个人信息', 'warning');
    navigateTo('profile');
    return;
  }
  showLoading('AI正在为你智能匹配岗位...');
  setTimeout(() => {
    const direction = document.getElementById('matchDirection').value;
    const threshold = parseInt(document.getElementById('matchThreshold').value) || 0;
    const results = matchingEngine.batchMatch(profile, JOB_DATABASE, {
      direction: direction !== 'all' ? direction : undefined, threshold
    });
    AppState.matchResults = results;
    renderMatchResults(results);
    updateDashboard();
    hideLoading();
    if (results.length === 0) showToast('没有找到匹配的岗位，请尝试降低匹配度要求', 'info');
    else showToast(`为你找到 ${results.length} 个匹配岗位`, 'success');
  }, 1500);
}

function renderMatchResults(results) {
  const container = document.getElementById('matchingResult');
  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h3>暂无匹配岗位</h3><p>请尝试调整筛选条件或完善个人信息后重新匹配</p></div>`;
    return;
  }
  container.innerHTML = `<div class="job-list">${results.map(r => renderJobCard(r)).join('')}</div>`;
  updateOptimizeJobSelect(results);
}

function renderJobCard(result) {
  const { job, totalScore } = result;
  const scoreClass = totalScore >= 75 ? 'match-high' : totalScore >= 55 ? 'match-medium' : 'match-low';
  return `<div class="job-card" onclick="showJobDetail('${job.id}')">
    <div class="job-card-header">
      <div class="job-title-row"><span class="job-title">${job.title}</span><span class="job-company">${job.company}</span></div>
      <span class="match-score-badge ${scoreClass}">${totalScore}% 匹配</span>
    </div>
    <div class="job-meta">
      <span class="job-salary">${job.salary}</span>
      <span class="job-tag">${job.city}</span>
      <span class="job-tag">${job.education}</span>
      <span class="job-tag">${job.expRequired}</span>
      ${job.tags.map(t => `<span class="job-tag">${t}</span>`).join('')}
    </div>
    <div class="job-card-footer">
      <div class="job-skills">${job.skills.slice(0, 6).map(s => `<span class="job-skill-tag">${s}</span>`).join('')}</div>
      <span class="job-detail-btn">查看详情 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>
    </div>
  </div>`;
}

function showJobDetail(jobId) {
  const result = AppState.matchResults.find(r => r.job.id === jobId);
  if (!result) return;
  const { job, totalScore, details } = result;
  document.getElementById('modalJobTitle').textContent = `${job.title} - ${job.company}`;
  document.getElementById('modalJobBody').innerHTML = `
    <div class="modal-detail-row"><span class="modal-detail-label">薪资</span><span class="modal-detail-value" style="color:var(--primary);font-weight:600">${job.salary}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">地点</span><span class="modal-detail-value">${job.city}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">学历</span><span class="modal-detail-value">${job.education}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">经验</span><span class="modal-detail-value">${job.expRequired}</span></div>
    <div style="margin:16px 0"><h4 style="font-size:14px;margin-bottom:8px;color:var(--text-secondary)">岗位描述</h4><p style="font-size:14px;line-height:1.7;">${job.description}</p></div>
    <div style="margin:16px 0"><h4 style="font-size:14px;margin-bottom:8px;color:var(--text-secondary)">任职要求</h4><ul style="font-size:14px;line-height:1.8;padding-left:18px;color:var(--text-secondary);">${job.requirements.map(r => `<li>${r}</li>`).join('')}</ul></div>
    <div class="match-breakdown"><h4>匹配度分析（综合 ${totalScore}%）</h4>
      ${details.map(d => {
        const level = d.score >= 75 ? 'high' : d.score >= 50 ? 'medium' : 'low';
        return `<div class="breakdown-item"><div class="breakdown-header"><span>${d.dimension} ${d.score}分</span></div><div class="breakdown-bar"><div class="breakdown-fill ${level}" style="width:${d.score}%"></div></div><p style="font-size:13px;color:var(--text-muted);margin-top:6px;">${d.analysis}</p></div>`;
      }).join('')}
    </div>`;
  document.getElementById('jobDetailModal').classList.add('active');
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ==================== 简历分析 ====================
function loadSampleResume() {
  document.getElementById('resumeContent').value = `张三 | 13812345678 | zhangsan@email.com

教育背景
XX大学 | 计算机科学与技术 | 本科 | 2025届

专业技能
熟练掌握 JavaScript、TypeScript、HTML5、CSS3
熟悉 React、Vue.js 前端框架
了解 Node.js、Express 后端开发
掌握 MySQL、MongoDB 数据库
熟悉 Git 版本控制工具
了解 Docker 容器化部署

项目经验
1. 校园课程管理系统 | 前端开发 | 2024.03-2024.06
- 负责前端页面的设计与开发，使用 React + Ant Design 构建管理系统界面
- 实现课程查询、选课管理、成绩查看等核心功能模块
- 使用 Redux 管理全局状态，优化页面渲染性能，首屏加载时间降低40%
- 项目上线后服务全校3000+学生使用

2. 个人技术博客 | 全栈开发 | 2023.09-2024.01
- 独立开发基于 Vue.js + Node.js 的个人博客系统
- 实现文章发布、分类标签、评论系统等功能
- 使用 MongoDB 存储数据，部署在云服务器上

实习经验
字节跳动 | 前端开发实习生 | 2024.07-2024.09
- 参与抖音创作者平台的前端开发工作
- 负责3个功能模块的开发和上线，优化了页面交互体验
- 使用 React + TypeScript 重构了历史遗留模块，代码可维护性显著提升

自我评价
对前端开发有浓厚兴趣，具备扎实的前端基础知识。学习能力强，在实习期间快速适应了大型项目的开发流程。具有良好的团队协作意识和代码规范意识。`;
  showToast('已加载示例简历', 'info');
}

function analyzeResume() {
  const text = document.getElementById('resumeContent').value.trim();
  if (!text || text.length < 50) { showToast('请输入足够的简历内容（至少50字）', 'warning'); return; }
  showLoading('AI正在分析你的简历...');
  setTimeout(() => {
    let targetJob = null;
    if (AppState.matchResults.length > 0) targetJob = AppState.matchResults[0].job;
    const analysis = resumeAnalyzer.analyze(text, targetJob);
    AppState.resumeAnalysis = analysis;
    renderResumeAnalysis(analysis);
    updateDashboard();
    hideLoading();
    showToast(`简历分析完成，综合评分 ${analysis.overallScore} 分`, 'success');
  }, 2000);
}

function renderResumeAnalysis(analysis) {
  const container = document.getElementById('resumeAnalysisResult');
  const levelMap = {
    excellent: { class: 'score-excellent', text: '优秀' },
    good: { class: 'score-good', text: '良好' },
    fair: { class: 'score-fair', text: '一般' },
    poor: { class: 'score-poor', text: '待改进' }
  };
  const level = levelMap[analysis.level];
  const dimBars = Object.values(analysis.dimensionScores).map(d => {
    const color = d.score >= 75 ? 'var(--success)' : d.score >= 50 ? 'var(--warning)' : 'var(--danger)';
    return `<div class="dim-item"><span class="dim-label">${d.label}</span><div class="dim-bar"><div class="dim-fill" style="width:${d.score}%;background:${color}"></div></div><span class="dim-score">${d.score}</span></div>`;
  }).join('');
  const info = analysis.extractedInfo;
  const infoTags = [
    info.education && `<span class="info-tag">学历: ${info.education}</span>`,
    info.school && `<span class="info-tag">院校: ${info.school}</span>`,
    info.major && `<span class="info-tag">专业: ${info.major}</span>`,
    ...info.skills.map(s => `<span class="info-tag">${s}</span>`),
    info.hasPhone && `<span class="info-tag">有手机号</span>`,
    info.hasEmail && `<span class="info-tag">有邮箱</span>`
  ].filter(Boolean).join('');
  const strengths = analysis.strengths.map(s => `<li style="color:var(--success)">${s}</li>`).join('');
  const weaknesses = analysis.weaknesses.map(s => `<li style="color:var(--danger)">${s}</li>`).join('');

  container.innerHTML = `
    <div class="analysis-score-card">
      <div class="analysis-score-circle ${level.class}"><span>${analysis.overallScore}</span></div>
      <p class="score-label">综合评分 - ${level.text}</p>
    </div>
    <div class="dimension-scores"><h4>各维度评分</h4>${dimBars}</div>
    <div class="extracted-info"><h4>识别到的关键信息</h4><div class="info-tag-list">${infoTags || '<span class="info-tag">未识别到明确信息</span>'}</div></div>
    ${analysis.keywordHits.length > 0 ? `<div class="extracted-info"><h4 style="color:var(--success)">命中岗位关键词</h4><div class="info-tag-list">${analysis.keywordHits.map(s => `<span class="info-tag" style="background:var(--success-bg);color:var(--success)">${s}</span>`).join('')}</div></div>` : ''}
    ${analysis.keywordMisses.length > 0 ? `<div class="extracted-info"><h4 style="color:var(--warning)">缺失岗位关键词</h4><div class="info-tag-list">${analysis.keywordMisses.map(s => `<span class="info-tag" style="background:var(--warning-bg);color:var(--warning)">${s}</span>`).join('')}</div></div>` : ''}
    ${strengths ? `<div style="margin-top:16px"><h4 style="font-size:14px;margin-bottom:8px;color:var(--success)">优势</h4><ul style="font-size:13px;padding-left:16px;line-height:1.8">${strengths}</ul></div>` : ''}
    ${weaknesses ? `<div style="margin-top:16px"><h4 style="font-size:14px;margin-bottom:8px;color:var(--danger)">待改进</h4><ul style="font-size:13px;padding-left:16px;line-height:1.8">${weaknesses}</ul></div>` : ''}`;
}

// ==================== 简历优化 ====================
function updateOptimizeJobSelect(results) {
  const select = document.getElementById('optimizeJobSelect');
  const btn = document.getElementById('generateOptBtn');
  if (!select) return;
  select.innerHTML = results.map(r => `<option value="${r.job.id}">${r.job.title} - ${r.job.company} (${r.totalScore}%匹配)</option>`).join('');
  btn.disabled = results.length === 0;
}

function generateOptimization() {
  const jobId = document.getElementById('optimizeJobSelect').value;
  if (!jobId) return;
  const result = AppState.matchResults.find(r => r.job.id === jobId);
  if (!result) return;
  const resumeText = document.getElementById('resumeContent')?.value?.trim();
  if (!resumeText || resumeText.length < 50) { showToast('请先在"简历分析"页面输入简历内容', 'warning'); return; }
  showLoading('AI正在生成个性化简历优化建议...');
  setTimeout(() => {
    const analysis = resumeAnalyzer.analyze(resumeText, result.job);
    const suggestions = resumeAnalyzer.generateOptimization(analysis, result.job);
    const optimizedSections = resumeAnalyzer.generateOptimizedResume(analysis, AppState.userProfile, result.job);
    AppState.resumeAnalysis = analysis;
    AppState.optimizationSuggestions = suggestions;
    renderOptimizationResult(suggestions, optimizedSections, result.job);
    hideLoading();
    showToast(`已生成 ${suggestions.length} 条优化建议`, 'success');
  }, 2000);
}

function renderOptimizationResult(suggestions, sections, job) {
  const container = document.getElementById('optimizeResult');
  const priorityLabels = {
    high: { text: '高优先级', class: 'priority-tag-high' },
    medium: { text: '中优先级', class: 'priority-tag-medium' },
    low: { text: '低优先级', class: 'priority-tag-low' }
  };
  const suggestionCards = suggestions.map(s => {
    const pl = priorityLabels[s.priority];
    return `<div class="suggestion-card priority-${s.priority}">
      <div class="suggestion-header"><span class="suggestion-priority ${pl.class}">${pl.text}</span><span class="suggestion-category">${s.category}</span></div>
      <h4 class="suggestion-title">${s.title}</h4>
      <p class="suggestion-body">${s.body}</p>
      <div class="suggestion-example">${s.example}</div>
    </div>`;
  }).join('');
  const resumeHTML = sections.map(s => `
    <div class="resume-section-block"><h4 class="resume-section-title">${s.title}</h4><div class="resume-section-content">${s.content.replace(/\n/g, '<br>')}</div></div>`
  ).join('');
  container.innerHTML = `
    <div style="margin-bottom:20px"><h3 style="font-size:18px;font-weight:600;margin-bottom:6px;">针对「${job.title}」的优化建议</h3><p style="font-size:14px;color:var(--text-muted);">共 ${suggestions.length} 条建议，按优先级排序</p></div>
    <div class="suggestion-cards">${suggestionCards}</div>
    <div class="optimized-resume-section">
      <h3><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>优化后的简历参考</h3>
      <div class="optimized-resume-card">${resumeHTML}</div>
    </div>`;
}

// ==================== 工作台仪表盘 ====================
function updateDashboard() {
  const resultCount = AppState.matchResults.length;
  const avgMatch = resultCount > 0 ? Math.round(AppState.matchResults.reduce((s, r) => s + r.totalScore, 0) / resultCount) : '--';
  const resumeScore = AppState.resumeAnalysis?.overallScore || '--';
  const suggestionCount = AppState.optimizationSuggestions.length || '--';
  animateNumber('statJobCount', resultCount);
  document.getElementById('statAvgMatch').textContent = avgMatch;
  document.getElementById('statResumeScore').textContent = resumeScore;
  document.getElementById('statSuggestions').textContent = suggestionCount;
  const badge = document.getElementById('topMatchBadge');
  if (resultCount > 0 && avgMatch !== '--') { badge.style.display = 'flex'; document.getElementById('topMatchScore').textContent = avgMatch; }
  renderDashboardCharts();
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  let step = 0;
  const interval = setInterval(() => {
    step++;
    el.textContent = Math.round(Math.min(step / 10, 1) * target);
    if (step >= 10) clearInterval(interval);
  }, 50);
}

function renderDashboardCharts() {
  renderMatchDistChart();
  renderSkillRadarChart();
}

function renderMatchDistChart() {
  const canvas = document.getElementById('matchDistChart');
  if (!canvas) return;
  if (AppState.charts.matchDist) AppState.charts.matchDist.destroy();
  const high = AppState.matchResults.filter(r => r.totalScore >= 75).length;
  const medium = AppState.matchResults.filter(r => r.totalScore >= 55 && r.totalScore < 75).length;
  const low = AppState.matchResults.filter(r => r.totalScore < 55).length;
  AppState.charts.matchDist = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['高匹配(75%+)', '中匹配(55-75%)', '低匹配(<55%)'],
      datasets: [{ data: [high, medium, low], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'], borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}个岗位` } } }
    }
  });
}

function renderSkillRadarChart() {
  const canvas = document.getElementById('skillRadarChart');
  if (!canvas) return;
  if (AppState.charts.skillRadar) AppState.charts.skillRadar.destroy();
  const skills = AppState.userProfile.skills.slice(0, 8);
  const proficiency = skills.map(s => AppState.userProfile.skillProficiency[s] || 70);
  if (skills.length === 0) {
    AppState.charts.skillRadar = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: { labels: ['请先添加技能'], datasets: [{ label: '技能熟练度', data: [0], borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: '#E2E8F0' } } } }
    });
    return;
  }
  AppState.charts.skillRadar = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: skills,
      datasets: [{ label: '技能熟练度', data: proficiency, borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 2, pointBackgroundColor: '#6366F1', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, display: false }, grid: { color: '#E2E8F0' }, pointLabels: { font: { size: 11 } } } }
    }
  });
}

// ==================== UI工具 ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showLoading(text = 'AI正在分析中...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}
