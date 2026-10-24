(() => {
  const raw = window.COMPETITION_CALENDAR || [];
  const patterns = window.COMPETITION_ANNUAL_PATTERNS || [];
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  window.getCompetitionCalendar = () => {
    const today = localToday();
    const yearNow = Number(today.slice(0,4));
    const makeDate = (year, month, day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const annual = patterns.map(pattern => {
      let year = Math.max(yearNow, pattern.firstYear || yearNow);
      const toYearOffset = pattern.toYearOffset || 0;
      const cycleYears = Math.max(1, pattern.cycleYears || 1);
      while (makeDate(year + toYearOffset, pattern.toMonth, pattern.toDay) < today) year += cycleYears;
      const from = makeDate(year, pattern.fromMonth, pattern.fromDay);
      const to = makeDate(year + toYearOffset, pattern.toMonth, pattern.toDay);
      const dateLabel = pattern.fromMonth === pattern.toMonth && !toYearOffset
        ? `${year}年${pattern.fromMonth}月关注窗口（动态预估）`
        : toYearOffset
          ? `${year}年${pattern.fromMonth}月–${year + toYearOffset}年${pattern.toMonth}月关注窗口（动态预估）`
          : `${year}年${pattern.fromMonth}–${pattern.toMonth}月关注窗口（动态预估）`;
      return {...pattern, from, to, dateLabel, note:`${pattern.note} 本次打开日期为${today}，已滚动推算至最近的年度窗口。`};
    });
    return [...raw.filter(item => !item.annualPatternId), ...annual];
  };
  window.getCompetitionLocalDate = localToday;
})();
