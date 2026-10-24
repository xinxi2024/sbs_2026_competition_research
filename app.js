(() => {
  const events = window.COMPETITIONS || [];
  const calendarItems = window.getCompetitionCalendar ? window.getCompetitionCalendar() : (window.COMPETITION_CALENDAR || []);
  const detailUpdates = window.COMPETITION_DETAIL_UPDATES || {};
  events.forEach(event=>{const update=detailUpdates[event.id];if(update){const extraSources=update.sources||[];Object.assign(event.detail,Object.fromEntries(Object.entries(update).filter(([key])=>key!=='sources')));event.sources=[...event.sources,...extraSources.filter(extra=>!event.sources.some(source=>source.url===extra.url))];}});
  const tags = ['物联网','嵌入式','软件','数据与AI','创新创业','商科与管理','设计与传媒','语言与写作','职业技能','综合素养'];
  const classes = ['A类甲等','B类甲等','A类乙等','B类乙等','丙等'];
  const awards = [
    {category:'A类甲等',first:'30,000',second:'25,000',third:'20,000'},
    {category:'B类甲等',first:'15,000',second:'12,000',third:'10,000'},
    {category:'A类乙等',first:'8,000',second:'5,000',third:'3,000'},
    {category:'B类乙等',first:'5,000',second:'3,000',third:'2,000'},
    {category:'丙等',first:'—',second:'—',third:'国家级≥1,000 / 省级≥500'}
  ];
  const byId = new Map(events.map(e => [e.id,e]));
  let regionSerial=0;
  const regionItems=events.flatMap(event=>event.regionEntries.map(region=>{regionSerial++;return {id:`region-${String(regionSerial).padStart(3,'0')}`,event,region};}));
  const regionById=new Map(regionItems.map(item=>[item.id,item]));
  const catalogItems=[...events.map(event=>({id:event.id,event,region:null})),...regionItems];
  const categoryCounts=catalogItems.reduce((counts,item)=>{const category=item.region?.category||item.event.category;counts[category]=(counts[category]||0)+1;return counts;},{});
  const sourceCategoryCounts={
    main:events.reduce((counts,event)=>(counts[event.category]=(counts[event.category]||0)+1,counts),{}),
    region:regionItems.reduce((counts,item)=>(counts[item.region.category]=(counts[item.region.category]||0)+1,counts),{})
  };
  const categoryLabel=category=>`${category} · ${categoryCounts[category]||0}项（主表${sourceCategoryCounts.main[category]||0} + 右栏${sourceCategoryCounts.region[category]||0}）`;
  const catalog = document.getElementById('catalog-section');
  const detailView = document.getElementById('detail-view');
  const search = document.getElementById('search-input');
  const classFilter = document.getElementById('class-filter');
  const regionFilter = document.getElementById('region-filter');
  const sortSelect = document.getElementById('sort-select');
  const cardsGrid = document.getElementById('cards-grid');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');
  let chosenTag = '';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const niceCategory = text => esc(text).replace('类','类 ');
  const fitText = fit => ({high:'高度适配',medium:'可迁移',low:'探索型'}[fit] || '探索型');
  const rangeText = arr => `${Number.isInteger(arr[0])?arr[0]:arr[0].toFixed(1)}–${Number.isInteger(arr[1])?arr[1]:arr[1].toFixed(1)}%`;
  const isoToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const calendarFor=id=>calendarItems.filter(item=>item.eventId===id);
  const dateStamp=value=>new Date(`${value.slice(0,10)}T00:00:00`);

  document.getElementById('hero-stats').innerHTML = `
    <div class="stat"><strong>${catalogItems.length}</strong><span>名单记录（主表 147 + 右栏 38）</span></div>
    <div class="stat"><strong>${events.length}</strong><span>主表项目</span></div>
    <div class="stat"><strong>${events.filter(e=>e.fit==='high').length}</strong><span>优先适配方向</span></div>`;
  const pendingVerification=events.filter(e=>e.detail.status==='待逐项核验').length;
  document.getElementById('coverage-note').innerHTML=`<strong>资料核验进度</strong><span>${events.length-pendingVerification} 项有专项赛事资料 · ${pendingVerification} 项仍需逐项核对官方章程</span><small>待核验项目仅提供方向性筛查，不将赛制、时间、地点或提交物推测为事实。</small>`;
  tags.forEach(tag => {
    const button = document.createElement('button');
    button.type='button'; button.className='chip'; button.textContent=tag; button.dataset.tag=tag;
    button.addEventListener('click',()=>{chosenTag=chosenTag===tag?'':tag;drawChips();renderCards();});
    document.getElementById('tag-filters').appendChild(button);
  });
  [{value:'B类',label:`B类全部等级 · ${categoryCounts['B类甲等']+categoryCounts['B类乙等']}项（主表${(sourceCategoryCounts.main['B类甲等']||0)+(sourceCategoryCounts.main['B类乙等']||0)} + 右栏${(sourceCategoryCounts.region['B类甲等']||0)+(sourceCategoryCounts.region['B类乙等']||0)}）`},...classes.map(value=>({value,label:categoryLabel(value)}))].forEach(({value,label})=>{const opt=document.createElement('option');opt.value=value;opt.textContent=label;classFilter.appendChild(opt);});
  function drawChips(){document.querySelectorAll('.chip').forEach(el=>el.classList.toggle('active',el.dataset.tag===chosenTag));}
  function getFiltered(){
    const q=search.value.trim().toLowerCase();
    let list=catalogItems.filter(e=>{
      const title=e.region?.name||e.event.name;const category=e.region?.category||e.event.category;const event=e.event;
      const text=[title,category,event.name,...(event.aliases||[]),...event.tags,event.detail.what,event.detail.deliver].join(' ').toLowerCase();
      const categoryMatches=!classFilter.value||(classFilter.value==='B类'?category.startsWith('B类'):category===classFilter.value);
      return (!q||text.includes(q))&&(!chosenTag||event.tags.includes(chosenTag))&&categoryMatches&&(!regionFilter.value||Boolean(e.region)||event.regionEntries.length>0);
    });
    const rank={high:0,medium:1,low:2};
    const categoryOf=item=>item.region?.category||item.event.category;const nameOf=item=>item.region?.name||item.event.name;
    if(sortSelect.value==='name')list.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'zh-CN'));
    else if(sortSelect.value==='class')list.sort((a,b)=>classes.indexOf(categoryOf(a))-classes.indexOf(categoryOf(b))||nameOf(a).localeCompare(nameOf(b),'zh-CN'));
    else list.sort((a,b)=>rank[a.event.fit]-rank[b.event.fit]||classes.indexOf(categoryOf(a))-classes.indexOf(categoryOf(b))||nameOf(a).localeCompare(nameOf(b),'zh-CN'));
    return list;
  }
  function renderCards(){
    const list=getFiltered();resultCount.textContent=list.length;emptyState.hidden=!!list.length;cardsGrid.hidden=!list.length;
    document.getElementById('active-filters').innerHTML=[chosenTag,classFilter.value==='B类'?'B类全部等级':classFilter.value,regionFilter.value?'有上海赛区条目':''].filter(Boolean).map(x=>`<span class="filter-pill">${esc(x)}</span>`).join('');
    cardsGrid.innerHTML=list.map(item=>{const e=item.event;const title=item.region?.name||e.name;const itemCategory=item.region?.category||e.category;const description=item.region?`名单右栏独立赛区条目，关联主项目「${e.name}」。赛区要求与赛程待该赛项官方通知核实。`:e.detail.what;return `<article class="event-card ${item.region?'region-event-card':''}" tabindex="0" role="link" aria-label="查看${esc(title)}详情" data-id="${item.id}">
      <div class="card-top"><span class="category-badge">${niceCategory(itemCategory)}</span><span class="fit-badge ${e.fit==='high'?'high':''}">${fitText(e.fit)}</span></div>
      <h3 class="card-title">${esc(title)}</h3><p class="card-summary">${esc(description)}</p>
      <div class="card-tags">${e.tags.slice(0,3).map(t=>`<span class="mini-tag">${esc(t)}</span>`).join('')}${item.region?'<span class="mini-tag">右栏赛区条目</span>':e.regionEntries.length?'<span class="mini-tag">含上海赛区条目</span>':''}</div>
      <div class="card-foot"><span><i class="award-dot"></i>${item.region?'赛区细则待核验':esc(e.detail.status)}</span><span class="arrow">↗</span></div></article>`;}).join('');
  }
  function clearFilters(){search.value='';chosenTag='';classFilter.value='';regionFilter.value='';sortSelect.value='fit';drawChips();renderCards();}
  document.getElementById('clear-filters').addEventListener('click',clearFilters);
  document.getElementById('empty-clear').addEventListener('click',clearFilters);
  search.addEventListener('input',renderCards);classFilter.addEventListener('change',renderCards);regionFilter.addEventListener('change',renderCards);sortSelect.addEventListener('change',renderCards);
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}if(e.key==='Escape'&&location.hash.startsWith('#event-'))location.hash='';});
  cardsGrid.addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(card)location.hash=card.dataset.id;});
  cardsGrid.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-id]')){e.preventDefault();location.hash=e.target.dataset.id;}});

  function awardRows(category){return awards.map(row=>`<tr class="${row.category===category?'is-highlight':''}"><td>${esc(row.category)}</td><td class="money ${row.first==='—'?'empty-money':''}">${row.first}</td><td class="money ${row.second==='—'?'empty-money':''}">${row.second}</td><td class="money">${row.third}</td></tr>`).join('');}
  function quickRead(event){
    const tags=event.tags.join(' ');let theme='tech';let title='从问题到可验证方案';let stages=['识别需求','设计方案','制作与测试','提交 / 展示'];let cue='通常需要把一个问题转化为可演示、可说明的成果。';
    if(tags.includes('职业技能')||tags.includes('技能')){theme='skill';title='从任务要求到现场表现';stages=['读懂任务','专项训练','限时实操','现场评价'];cue='重点看技能熟练度、规范操作与限定时间内的完成质量。';}
    else if(tags.includes('建模')||tags.includes('数学')||tags.includes('数据')||tags.includes('算法')){theme='research';title='从问题数据到论证结论';stages=['理解问题','分析 / 建模','验证结果','论文 / 答辩'];cue='重点看问题拆解、方法选择、结果验证和表达是否连贯。';}
    else if(tags.includes('创新创业')||tags.includes('商科')||tags.includes('管理')||tags.includes('创业')){theme='business';title='从真实需求到可行项目';stages=['发现需求','调研验证','方案 / 原型','路演评审'];cue='重点看需求是否真实、方案是否可执行，以及团队能否讲清价值。';}
    else if(tags.includes('设计')||tags.includes('传媒')||tags.includes('广告')||tags.includes('艺术')){theme='design';title='从主题命题到完整作品';stages=['理解命题','创意构思','制作打磨','作品评审'];cue='重点看创意表达、制作完成度、主题契合和提交规范。';}
    else if(tags.includes('语言')||tags.includes('写作')||tags.includes('文学')||tags.includes('翻译')){theme='writing';title='从主题材料到清晰表达';stages=['确定主题','收集材料','写作 / 表达','提交评审'];cue='重点看内容准确度、逻辑、表达质量和格式要求。';}
    else if(tags.includes('编程')||tags.includes('软件')||tags.includes('嵌入式')||tags.includes('物联网')||tags.includes('电子')||tags.includes('硬件')||tags.includes('AI')){theme='tech';title='从需求场景到技术作品';stages=['拆解场景','实现方案','联调测试','演示 / 答辩'];cue='重点看作品能否运行、解决具体问题，并由团队清楚解释技术选择。';}
    const stagesHtml=stages.map((stage,index)=>`<div class="quick-stage"><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(stage)}</strong></div>`).join('');
    const evidence=event.detail.status==='待逐项核验'?'按项目名称、校内分类和标签生成的方向性判断；官方细则待核验。':'根据当前已整理的赛项简介与标签提炼；具体赛道仍以当届规则为准。';
    return `<figure class="quick-read-card theme-${theme}"><div class="quick-read-head"><div><div class="forecast-kicker">QUICK READ / 赛项速读</div><h2>${esc(title)}</h2></div><span class="quick-read-stamp">4 步看懂</span></div><div class="quick-flow" role="img" aria-label="${esc(stages.join('，'))}"><svg viewBox="0 0 900 30" preserveAspectRatio="none" aria-hidden="true"><path d="M109 15 H791"/><path d="M781 8 L793 15 L781 22"/><circle cx="109" cy="15" r="7"/><circle cx="336" cy="15" r="7"/><circle cx="564" cy="15" r="7"/><circle cx="791" cy="15" r="7"/></svg>${stagesHtml}</div><figcaption><strong>快速判断</strong><span>${esc(cue)}</span><small>项目理解示意图 · 非主办方官方赛制图。${esc(evidence)}</small></figcaption></figure>`;
  }
  function scheduleDetail(event,regionEntry){const items=calendarFor(event.id).sort((a,b)=>a.from.localeCompare(b.from));return `<section class="detail-card schedule-detail-card"><div class="schedule-detail-heading"><div><div class="forecast-kicker">TIMELINE / 官方节点与窗口参考</div><h2><span>02</span>${regionEntry?'赛区赛程核对与主项目参考':'报名、提交与比赛时间'}</h2></div><span class="calendar-mark">${items.length} 条时间线</span></div>${regionEntry?`<div class="data-warning">下列时间线来自关联主项目“${esc(event.name)}”，只作方向参考。该右栏赛区条目的报名、举办日期和地点尚需对应赛区通知核实。</div>`:''}${items.length?`<div class="schedule-detail-list">${items.map(item=>`<article class="schedule-detail-row ${item.type==='预估'?'estimate-row':''}"><div class="schedule-detail-date"><strong>${esc(item.dateLabel)}</strong><span>${esc(item.type)} · ${esc(item.certainty)}</span></div><div><h3>${esc(item.title)}</h3><p>${esc(item.note)}</p><small>地点/形式：${esc(item.place)}</small><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.source)} ↗</a>${item.registrationUrl?`<a class="timeline-registration" href="${esc(item.registrationUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.registrationLabel||'报名/赛事官网')} ↗</a>`:''}</div></article>`).join('')}</div>`:`<div class="data-warning">暂未找到可引用的本届报名日期或近届日程。报名方式、赛期与举办地点请先查看下方赛事官方来源，并关注学校教务处/指导教师通知；本页面不按赛事名称猜测月份。</div>`}<p class="schedule-disclaimer">“预估/参考”条目依据已公开往届规律推算，仅用于提前关注与备赛，具体时间地点以赛事当届通知为准。</p></section>`;}
  function progress(label,value){return `<div class="meter-row"><span>${label}</span><div class="meter-track"><i style="width:${value*20}%"></i></div><strong>${value}/5</strong></div>`;}
  function personalAssessment(event){
    const text=`${event.name} ${event.tags.join(' ')}`.toLowerCase();
    const profile={
      base:'你已有 Python 数据处理、独立开发并部署线上应用的经验；物联网工程课程在起步阶段，C 语言和嵌入式仍是正在补的基础。',
      gap:'目前没有该赛道的往届作品、校内选拔名次或同类比赛成绩可用于判断；以下是根据赛事方向与已知技能给出的备赛建议。',
      action:'先找一份最近届官方题目或作品要求，做出一个可展示的最小样例，再决定是否投入完整赛季。'
    };
    if(/英语|外语|翻译|日语|韩语|词汇|辩论|演讲|商务英语/.test(text)){
      profile.base='你有英语学习基础，英语曾是三校生高考科目；你也把英语提升列为当前目标。技术项目文档与结构化表达可以迁移到备赛。';
      profile.gap='没有已知的英语演讲、翻译或限时写作竞赛成绩；口语流畅度、语言准确度和赛项专用格式仍需实测。';
      profile.action='先按该赛项最近届样题完成一次限时任务：演讲录一段 3 分钟视频，写作/翻译完成一份限时稿，之后按官方评分项逐条复盘。';
    }else if(/市场调查|统计建模|数学建模|能源经济|数据分析|大数据|统计/.test(text)){
      profile.base='你的数学基础较强，能用 Python 做数据处理，也做过大数据可视化项目；这些经验能用于清洗数据、复现分析和制作图表。';
      profile.gap='竞赛更看重问题定义、抽样/数据来源、统计方法选择和报告论证；会写代码不等于调查设计或模型解释已经达标。';
      profile.action='用最近届题目完成一份 2–3 页小报告：明确研究问题、数据来源、方法、图表和局限；市调类先做一份问卷并试访 5 人。';
    }else if(/物联网|嵌入式|芯片|电子|机器人|智能汽车|智能制造|硬件|通信|光电|机电|工程实践/.test(text)){
      profile.base='你是物联网工程专业，有电子与信息方向实作经历，也能用 Python 做原型和数据处理；这为传感器、控制、联调和展示提供了起点。';
      profile.gap='当前明确在补 C 语言与嵌入式基础；电路调试、器件选型、实时程序、焊接/仪器操作等是否熟练，现有资料无法确认。';
      profile.action='先做一个传感器采集→单片机/开发板处理→可视化展示的闭环小样机；记录接线图、测试数据和故障复盘，再对照该赛道任务书补短板。';
    }else if(/程序设计|软件|计算机|算法|人工智能|信息安全|网络安全|编程|服务外包|软件开发|数字媒体科技/.test(text)){
      profile.base='你熟练使用 Python，独立开发并部署过工具和小游戏；这说明你具备把需求拆成可运行功能、完成迭代和交付的经验。';
      profile.gap='若赛项考算法，需要补数据结构、复杂度和限时训练；若是团队作品赛，需要补赛题要求的语言/平台、测试、文档和协作。C 语言目前仍在入门。';
      profile.action='先完成最近届一套真题或一项官方任务：算法赛限时做 3 题并复盘错题；作品赛搭一个可运行原型并写清功能、测试结果和贡献分工。';
    }else if(/创业|创新|创意|挑战杯|商业|企业|金融|会计|税收|品牌|物流|电商|沙盘|模拟|经管|贸易|营销|职业规划/.test(text)){
      profile.base='你做过可上线的数字产品，能把想法做成演示原型；大数据项目和结构化文档经验也能支撑调研、分析与路演材料。';
      profile.gap='项目已经能运行，不代表需求、用户规模、成本和商业模式已验证；商业类竞赛还需要市场证据、财务逻辑、团队分工与现场表达。';
      profile.action='围绕一个具体用户问题访谈至少 5 位目标用户，整理需求证据、竞品、成本与验证结果；再按该赛项模板做 5 页以内路演稿或案例报告。';
    }else if(/设计|广告|艺术|传媒|文创|视觉|文学|写作|短视频|摄影|花园|服装/.test(text)){
      profile.base='你能独立完成数字产品并维护线上作品，具备持续迭代和按要求交付的习惯；这有助于把创意做成可提交作品。';
      profile.gap='目前资料没有证明你有该视觉/艺术门类的作品集或专业设计软件经验；评审通常会看主题契合、表达质量、制作完成度和格式规范。';
      profile.action='先从往届获奖作品里选 3 件拆解主题、构图/叙事和提交规范，制作一件对应赛道的小样并请老师或同学按评分表盲评。';
    }else if(/职业技能|技能大赛|世赛|技能竞赛/.test(text)){
      profile.base='你有电子与信息方向职业技能竞赛的实战经验，且做过软件项目交付；限时执行、团队协作和过程复盘能迁移到技能赛。';
      profile.gap='该赛事的工种、设备、操作规范和考核模块需要逐项对照；现有技能成绩不能直接推算到另一工种或新赛制。';
      profile.action='下载最近届技术文件，把考核项目拆成操作清单；先在校内确认同类设备/训练场地，再按官方任务做一次限时模拟并记录失分点。';
    }else{
      profile.base=`你已有软件项目开发与交付经验，物联网工程和数据处理能力可迁移到“${event.name}”中的信息整理、工具使用或成果展示环节。`;
      profile.gap='该项目当前只有名单分类和方向标签，具体赛项规则、评分点及你是否具备专项训练经历尚未核实；因此不把适配标签当作已证明的竞争力。';
      profile.action='先查赛事官方最近届通知和获奖样例，列出参赛资格、评分项、交付物三项清单；完成一份小样后再决定是否组队报名。';
    }
    if(event.id==='event-007'||event.id==='event-049'||event.id==='event-065'){
      profile.base='你熟练使用 Python 并独立开发过多款小游戏，具备把规则转成程序逻辑的经历；这是算法训练的起点。';
      profile.gap='ICPC、蓝桥杯等限时编程主要考数据结构、算法和边界处理，已有应用开发经验不能替代竞赛题训练；你目前 C 语言仍在入门。';
      profile.action='做一套最近届真题，按“读题—算法—复杂度—边界测试”复盘；ICPC 另需找两名稳定队友，每周至少一次三人限时训练。';
    }
    return profile;
  }
  function detailHtml(event,regionEntry=null){
    const d=event.detail;const isRegion=Boolean(regionEntry);const displayName=regionEntry?.name||event.name;const displayCategory=regionEntry?.category||event.category;const displayStatus=isRegion?'右栏赛区条目 · 赛区细则待核验':d.status;
    const assessment=personalAssessment(event);
    const references=event.sources.map(s=>`<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.label)}</span><span><small>${esc(s.kind)}</small> <b class="source-arrow">↗</b></span></a>`).join('');
    const stages=isRegion?`<span class="detail-tags">所属主表项目：${esc(event.name)}</span><span class="detail-tags">右栏分类：${esc(regionEntry.category)}</span>`:event.regionEntries.map(r=>`<span class="detail-tags">${esc(r.category)} · ${esc(r.name)}</span>`).join('');
    const regionalNotice=isRegion?`<div class="data-warning">此名称和分类来自名单右栏。当前没有单独核实该赛区赛项的规则；以下比什么、要求、作品、日程和个人估算均沿用关联主项目“${esc(event.name)}”作参考，不能视为赛区官方细则。</div>`:'';
    const field=value=>isRegion?`关联主项目参考（赛区待核验）：${value}`:value;
    return `<div class="site-shell detail-wrap">
      <a href="#catalog-start" class="back-link"><span>←</span> 返回竞赛库</a>
      <section class="detail-hero"><div class="detail-kicker">${isRegion?`RIGHT-COLUMN ENTRY / ${esc(displayCategory)}`:`PROJECT ${event.id.slice(-3)} / 2026 COMPETITION DATABASE`}</div><h1>${esc(displayName)}</h1><p>${isRegion?`这是名单右侧单列的赛区赛项，关联主表项目“${esc(event.name)}”。其名称和校内分类已确认，赛项规则与当届安排需按对应赛区通知核实。`:esc(d.what)}</p><div class="detail-badges"><span class="detail-badge lime">${niceCategory(displayCategory)} · 校内名单分类</span><span class="detail-badge">${isRegion?'赛区适配参考：':''}${fitText(event.fit)}</span><span class="detail-badge">${esc(displayStatus)}</span></div></section>
      ${quickRead(event)}
      <div class="detail-layout"><div class="detail-main">
        <section class="detail-card"><h2><span>01</span>${isRegion?'赛区赛项资料与主项目参考':'参赛与交付要点'}</h2>${regionalNotice}<div class="info-grid">
          <div class="info-cell"><label>WHAT / 比什么</label><p>${field(esc(d.what))}</p></div><div class="info-cell"><label>WHO / 参赛要求</label><p>${field(esc(d.req))}</p></div>
          <div class="info-cell"><label>FORMAT / 赛制形式</label><p>${field(esc(d.format))}</p></div><div class="info-cell"><label>DELIVER / 提交作品</label><p>${field(esc(d.deliver))}</p></div>
          <div class="info-cell"><label>WHEN / 时间参考</label><p>${field(esc(d.when))}</p></div><div class="info-cell"><label>WHERE / 地点参考</label><p>${field(esc(d.where))}</p></div>
        </div>${stages?`<div style="margin-top:14px"><div class="info-cell"><label>${isRegion?'LIST / 右栏独立赛项':'SHANGHAI / 名单内上海赛区条目'}</label><div class="tagline">${stages}</div></div></div>`:''}</section>
        ${scheduleDetail(event,regionEntry)}
        <section class="detail-card"><h2><span>03</span>针对你的适配判断</h2>${isRegion?`<div class="data-warning">本项适配和成长判断沿用关联主项目估算；赛区具体赛题、参赛范围与竞争规模尚未独立核实。</div>`:''}<div class="fit-assessment-grid"><article><strong>你的现有基础</strong><p>${esc(assessment.base)}</p></article><article><strong>当前具体缺口</strong><p>${esc(assessment.gap)}</p></article><article><strong>建议先做这一步</strong><p>${esc(assessment.action)}</p></article></div><div class="assessment-note"><strong>获奖区间的依据：</strong>${esc(d.rationale)} 适配判断基于你提供的专业、技能与项目经历；赛项标签或名称未能证明的能力会标为待确认。成长收益 ${d.growth}/5 指备赛过程可练到的技能；个人潜力 ${d.potential}/5 指当前基础经持续准备后的发展空间，不代表天赋或保证获奖。</div><div class="conduct-strip" style="margin-top:14px"><strong>操行评定参考：</strong>评定表中，竞赛获奖一、二、三等奖对应 4、3、2 分；国家级/省市级获奖一、二、三等奖对应 6、5、4 分，优胜/优秀等奖项为 2 分。是否适用取决于获奖级别、材料和当学期审核口径。</div></section>
        <section class="detail-card"><h2><span>04</span>来源与核验状态</h2><div class="data-warning">${isRegion?`名单右栏名称与分类已录入；该赛区赛项的官方报名要求、作品提交和地点待逐项核实。下方来源主要用于关联主项目参考。`:(d.status==='待逐项核验'?'当前尚未从该赛事官方章程确认具体赛制、报名条件和本届日程。下方提供赛事官网/官方通知检索入口；核实后再据此安排报名。':`赛事摘要状态：${esc(d.status)}。2026 年未发布的信息仍以赛事和学校当届通知为准。`)}</div><div class="source-list" style="margin-top:12px">${references}</div></section>
      </div><aside class="detail-side">
        <section class="detail-card match-card"><div class="match-top"><div><div class="match-title">PERSONAL FIT / ${isRegion?'赛区适配参考':'适配画像'}</div><div class="match-level">${fitText(event.fit)}</div></div><span class="match-label">物联网工程 · 2026级</span></div>${progress('成长收益',d.growth)}${progress('个人潜力',d.potential)}<p class="body-copy" style="margin-top:14px">${event.tags.map(t=>`<span class="detail-tags">${esc(t)}</span>`).join(' ')}</p></section>
        <section class="detail-card forecast-card"><div class="forecast-kicker">ESTIMATE / 主观概率区间</div><h2 style="margin-top:7px">获奖机会预估</h2><div class="forecast-values"><div class="forecast-box"><span>赛区体系任一正式奖</span><strong>${rangeText(event.chanceRange)}</strong></div><div class="forecast-box"><span>全国阶段获奖</span><strong>${rangeText(event.nationalRange)}</strong></div></div><p>${isRegion?'区间沿用关联主项目估算；赛区参赛分母和赛制未核实，不代表该右栏赛项的独立获奖率。':'为备赛筛选用的主观先验，不是历史统计。假设持续准备并获得必要队友/指导；目前缺少赛事分母、学校队伍和个人同赛道成绩数据。'}</p><span class="confidence">置信度：${esc(d.confidence)} · 估计</span></section>
        <section class="detail-card award-card"><h2><span>05</span>学校奖励金额参考</h2><p class="award-note">绿色高亮为本条目在 2026 名单中的校内分类。“类等”是学校竞赛分类，不是比赛的一、二、三等奖。${isRegion?'本条目分类来自名单右栏。':''}</p><table class="award-table"><thead><tr><th>名单分类</th><th>一等奖</th><th>二等奖</th><th>三等奖</th></tr></thead><tbody>${awardRows(displayCategory)}</tbody></table><div class="award-footnote">补充说明：课堂截图注明 A 类甲等一等奖全校仅 4 项，团队与个人均可申请。金额按你提供的课堂截图转录；上海商学院公开信息网当前可检索到的 2019 版奖励办法标准不同，现行适用性、获奖级别折算及申报资格仍以学校最新文件和审核为准。</div><a class="source-link" style="margin-top:9px" href="https://xxgk.sbs.edu.cn/xxgklm/xsswgl/xsjlcfbf/9ab36a22e4c24b5484e7caa6b2ed9358.htm" target="_blank" rel="noopener noreferrer"><span>上海商学院公开奖励办法（2019）</span><span class="source-arrow">↗</span></a></section>
      </aside></div></div>`;
  }
  function route(){
    const id=decodeURIComponent(location.hash.slice(1));const regionItem=regionById.get(id);const event=byId.get(id)||regionItem?.event;
    if(event){const displayName=regionItem?.region.name||event.name;catalog.hidden=true;document.querySelector('.hero').hidden=true;document.querySelector('.search-panel').hidden=true;detailView.hidden=false;detailView.innerHTML=detailHtml(event,regionItem?.region||null);window.scrollTo(0,0);document.title=`${displayName} · 上商竞赛雷达`;}
    else{detailView.hidden=true;detailView.innerHTML='';catalog.hidden=false;document.querySelector('.hero').hidden=false;document.querySelector('.search-panel').hidden=false;document.title='上商竞赛雷达 · 2026 学科竞赛库';if(id)history.replaceState(null,'',location.pathname+location.search);}
  }
  window.addEventListener('hashchange',route);renderCards();route();
})();
