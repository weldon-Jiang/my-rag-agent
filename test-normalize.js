const testQueries = [
  '今天乌鲁木齐天气怎么样',
  '乌鲁木齐今天天气',
  '深圳明天会不会下雨',
  '上海今天气温多少度',
  '北京后天风大吗',
  '广州后天天气',
  '明天深圳天气如何',
  '杭州今天会不会很热',
  '南京后天会下雨吗',
  '成都这周天气怎么样'
];

function normalizeChineseQuery(query) {
  const DATE_WORDS = [
    '今天', '明天', '后天', '大后天',
    '昨天', '前天', '大前天',
    '这周', '下周', '上周', '本周',
    '上上周', '下下周'
  ];

  const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

  const DATE_FULL_PATTERNS = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/
  ];

  const DATE_MONTH_DAY = /(\d{1,2})月(\d{1,2})日/;

  const WEATHER_WORDS = ['天气', '气温', '温度', '下雨', '晴天', '多云', '冷', '热', '刮风', '下雨吗', '会不会下雨', '会不会冷', '会不会热', '气温多少', '温度多少', '冷不冷', '热不热', '会不会很热', '会不会很冷', '风大吗', '风大不大'];

  const QUESTION_WORDS = ['吗', '呢', '吧', '呀', '啊', '哦', '么', '怎样', '怎么样', '如何', '多少', '会不会', '会不会', '好不好', '如何'];

  let cleanQuery = query;
  let extractedDate = null;
  let extractedLocation = null;
  let extractedWeather = null;
  let extractedQuestion = null;

  const dateWordsRegex = new RegExp(DATE_WORDS.filter(w => w.length > 1).sort((a, b) => b.length - a.length).map(w => w.replace(/[|^\\]/g, '\\$&')).join('|'));
  const dateMatch = cleanQuery.match(dateWordsRegex);
  if (dateMatch) {
    extractedDate = dateMatch[0];
    cleanQuery = cleanQuery.replace(dateMatch[0], ' ');
  }

  for (const word of WEEKDAY_NAMES) {
    const pattern = new RegExp(word);
    if (pattern.test(cleanQuery)) {
      extractedDate = word;
      cleanQuery = cleanQuery.replace(pattern, ' ');
      break;
    }
  }

  const fullDateMatch = DATE_FULL_PATTERNS.find(p => p.test(cleanQuery));
  if (fullDateMatch) {
    const match = cleanQuery.match(fullDateMatch);
    extractedDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    cleanQuery = cleanQuery.replace(fullDateMatch, ' ');
  }

  const monthDayMatch = DATE_MONTH_DAY.exec(cleanQuery);
  if (monthDayMatch) {
    const today = new Date();
    const year = today.getFullYear();
    extractedDate = `${year}-${monthDayMatch[1].padStart(2, '0')}-${monthDayMatch[2].padStart(2, '0')}`;
    cleanQuery = cleanQuery.replace(DATE_MONTH_DAY, ' ');
  }

  for (const word of WEATHER_WORDS) {
    if (cleanQuery.includes(word)) {
      extractedWeather = word;
      cleanQuery = cleanQuery.replace(word, ' ');
      break;
    }
  }

  for (const word of QUESTION_WORDS) {
    if (cleanQuery.includes(word)) {
      extractedQuestion = word;
      cleanQuery = cleanQuery.replace(word, ' ');
    }
  }

  cleanQuery = cleanQuery.replace(/[?？!！。，、,.\s]+/g, ' ').trim();

  const chineseOnly = cleanQuery.match(/[\u4e00-\u9fa5]+/g);
  if (chineseOnly && chineseOnly.length > 0) {
    for (const word of chineseOnly) {
      if (word.length >= 2 && word.length <= 10) {
        const notDateOrWeather = !DATE_WORDS.includes(word) && !WEEKDAY_NAMES.includes(word);
        const notWeatherWord = !WEATHER_WORDS.some(w => word.includes(w) || w.includes(word));
        if (notDateOrWeather && notWeatherWord && !extractedLocation) {
          extractedLocation = word;
          cleanQuery = cleanQuery.replace(word, ' ');
          break;
        }
      }
    }
  }

  cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

  let intent = 'general';
  const weatherIndicators = ['天气', '气温', '温度', '湿度', '风速', '风向', '体感温度', '雨', '雪', '雾', '云', '冰雹', '下雨', '晴天', '多云', '冷', '热', '刮风', '大风', '微风', '很热', '很冷', '风大'];
  for (const indicator of weatherIndicators) {
    if (query.includes(indicator)) {
      intent = 'get_weather';
      break;
    }
  }

  const locationIndicators = ['省', '市', '县', '区', '镇', '村', '位置', '在哪里', '经纬度', '海拔', '人口', '面积'];
  for (const indicator of locationIndicators) {
    if (query.includes(indicator)) {
      intent = 'get_location';
      break;
    }
  }

  return {
    location: extractedLocation,
    date: extractedDate,
    weather: extractedWeather,
    question: extractedQuestion,
    intent
  };
}

console.log('测试 normalizeChineseQuery 函数\n');
console.log('=' .repeat(80));

for (const query of testQueries) {
  const result = normalizeChineseQuery(query);
  console.log(`\n输入: "${query}"`);
  console.log(`  地点: ${result.location || '未识别'}`);
  console.log(`  日期: ${result.date || '未识别'}`);
  console.log(`  意图: ${result.intent}`);
}

console.log('\n' + '='.repeat(80));
console.log('测试完成');
