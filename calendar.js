(() => {
  const events = window.COMPETITIONS || [];
  const allItems = window.getCompetitionCalendar ? window.getCompetitionCalendar() : (window.COMPETITION_CALENDAR || []);
  const byId = new Map(events.map(event => [event.id,event]));
  const range = document.getElementById('calendar-range');
  const month = document.getElementById('calendar-month');
  const kind = document.getElementById('calendar-kind');
  const direction = document.getElementById('calendar-direction');
  const fit = document.getElementById('calendar-fit');
  const category = document.getElementById('calendar-class');
  const search = document.getElementById('calendar-search');
  const grid = document.getElementById('calendar-grid');
  const empty = document.getElementById('calendar-empty');
  const summary = document.getElementById('calendar-summary');
  const today = window.getCompetitionLocalDate ? window.getCompetitionLocalDate() : new Date().toISOString().slice(0,10);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateStamp = value => new Date(`${value.slice(0,10)}T00:00:00`);
  const overlap = (item,key) => item.from.slice(0,7) <= key && item.to.slice(0,7) >= key;
  const monthLabel = key => {const [year,monthNumber]=key.split('-');return `${year}年${Number(monthNumber)}月`;};
  const fitNames = {high:'高度适配',medium:'可迁移',low:'探索型'};
  const directionGroups = [
    ['物联网与嵌入式',/(物联网|嵌入式|电子|硬件|芯片|电路)/],
    ['软件与算法',/(软件|编程|算法|程序|Python|C\+\+|Java|人工智能|AI|信息安全)/i],
    ['数据与建模',/(数学|数据|建模|统计|金融)/],
    ['创新创业与商科',/(创新|创业|商科|管理|商业|电商|营销)/],
    ['设计与传媒',/(设计|传媒|广告|艺术|视觉|动画|视频)/],
    ['职业技能',/(职业技能|技能|职业规划|就业)/],
    ['语言与写作',/(语言|写作|文学|翻译|英语|演讲)/]
  ];
  const directionOf = event => directionGroups.find(([,pattern]) => pattern.test(`${event.name} ${event.tags.join(' ')} ${event.detail.what}`))?.[0] || '综合与其他';
  const activeOptions = [...new Set(events.map(directionOf))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  activeOptions.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;direction.appendChild(option);});
  const monthKeys = [...new Set(allItems.flatMap(item=>{const keys=[];let cursor=dateStamp(item.from);const last=dateStamp(item.to);while(cursor<=last){const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;if(key>=today.slice(0,7))keys.push(key);cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);}return keys;}))].sort();
  monthKeys.forEach(key=>{const option=document.createElement('option');option.value=key;option.textContent=monthLabel(key);month.appendChild(option);});
  const nowText = new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(dateStamp(today));
  document.getElementById('calendar-date-note').textContent=`本次打开：${nowText} · 年度规律窗口已滚动到最近时间；已公布节点与预估分开展示。`;

  function rankDate(item){return item.type==='报名'||item.type==='提交'?item.to:item.from;}
  function filteredByProject(item){
    const event=byId.get(item.eventId);if(!event)return false;
    const query=search.value.trim().toLowerCase();
    const haystack=[event.name,event.category,...event.tags,item.title,item.note,item.place].join(' ').toLowerCase();
    return (!query||haystack.includes(query))&&(!direction.value||directionOf(event)===direction.value)&&(!fit.value||event.fit===fit.value)&&(!category.value||event.category===category.value);
  }
  function render(){
    const end30=new Date(`${today}T00:00:00`);end30.setDate(end30.getDate()+30);const limit=`${end30.getFullYear()}-${String(end30.getMonth()+1).padStart(2,'0')}-${String(end30.getDate()).padStart(2,'0')}`;
    const monthSelected=Boolean(month.value);const base=allItems.filter(item=>{const inMonth=!monthSelected||overlap(item,month.value);const inRange=monthSelected||range.value==='all'||(item.to>=today&&item.from<=limit);const stillFuture=monthSelected||item.to>=today;return inMonth&&inRange&&stillFuture&&(!kind.value||item.type===kind.value)&&filteredByProject(item);});
    let visible=base.sort((a,b)=>rankDate(a).localeCompare(rankDate(b))||a.title.localeCompare(b.title,'zh-CN'));let extended=false;
    if(!visible.length&&!monthSelected&&range.value==='next30'){
      visible=allItems.filter(item=>item.to>=today&&(!kind.value||item.type===kind.value)&&filteredByProject(item)).sort((a,b)=>rankDate(a).localeCompare(rankDate(b))||a.title.localeCompare(b.title,'zh-CN')).slice(0,6);
      extended=visible.length>0;
    }
    const active=visible.filter(item=>item.type==='报名'&&item.from<=today&&today<=item.to).length;
    const upcoming=allItems.filter(item=>item.to>=today).sort((a,b)=>rankDate(a).localeCompare(rankDate(b)))[0];
    summary.innerHTML=`<span><strong>${visible.length}</strong> 条赛程</span><span><strong>${active}</strong> 项正在报名</span>${upcoming?`<span>最近日期 <strong>${esc(upcoming.dateLabel)}</strong></span>`:''}<small>${extended?'未来30天没有符合条件的赛程，已列出当前筛选条件下最近的日期线索。':'筛选条件可以组合使用；选中月份后将显示该月覆盖的时间窗口。'} 未核实的报名和具体地点以赛事、学校通知为准。</small>`;
    grid.innerHTML=visible.map(item=>{
      const event=byId.get(item.eventId);const ongoing=item.type==='报名'&&item.from<=today&&today<=item.to;const estimated=item.type==='预估'||item.certainty.includes('参考')||item.certainty.includes('预估');
      const left=Math.max(0,Math.ceil((dateStamp(item.to)-dateStamp(today))/86400000));const state=estimated?'年度预估':ongoing?'报名中':item.to<today?'已结束':item.type==='报名'?'即将截止':'时间参考';
      return `<article class="calendar-card ${estimated?'is-estimate':''}"><div class="calendar-card-top"><span class="calendar-kind">${esc(item.type)} · ${esc(event.category)}</span><span class="calendar-state">${state}</span></div><div class="calendar-date">${esc(item.dateLabel)}</div><h3>${esc(item.title)}</h3><p class="calendar-event-name">${esc(event.name)}</p><div class="calendar-card-tags"><span>${esc(directionOf(event))}</span><span>个人适配：${fitNames[event.fit]||'探索型'}</span><span>${esc(event.category)}</span></div><p class="calendar-note">${esc(item.note)}</p><div class="calendar-card-meta"><span>⌖ ${esc(item.place)}</span><span>${ongoing?`距截止 ${left} 天`:esc(item.certainty)}</span></div><div class="calendar-card-actions"><a href="index.html#${esc(item.eventId)}" class="calendar-detail-link">查看项目详情 ↗</a><a href="${esc(item.registrationUrl||item.url)}" target="_blank" rel="noopener noreferrer" class="calendar-source-link">${esc(item.registrationLabel||item.source)} ↗</a></div></article>`;
    }).join('');
    empty.hidden=visible.length>0;grid.hidden=!visible.length;
    const activeFilters=Boolean(search.value||month.value||kind.value||direction.value||fit.value||category.value||range.value!=='next30');
    document.getElementById('calendar-page-stats').innerHTML=`<div><strong>${allItems.filter(item=>item.to>=today).length}</strong><span>条未来节点</span></div><div><strong>${allItems.filter(item=>item.to>=today&&item.type==='报名'&&item.from<=today).length}</strong><span>正在报名</span></div><div><strong>${events.filter(event=>event.fit==='high').length}</strong><span>高度适配项目</span></div>`;
    grid.dataset.filtered=String(activeFilters);
  }
  [range,month,kind,direction,fit,category].forEach(select=>select.addEventListener('change',render));search.addEventListener('input',render);
  document.getElementById('calendar-reset').addEventListener('click',()=>{range.value='next30';month.value='';kind.value='';direction.value='';fit.value='';category.value='';search.value='';render();});
  render();
})();
