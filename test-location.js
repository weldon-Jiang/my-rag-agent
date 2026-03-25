const COMMON_CITIES = [
  '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉',
  '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛',
  '沈阳', '宁波', '昆明', '大连', '厦门', '福州', '无锡', '合肥',
  '济南', '哈尔滨', '长春', '吉林', '大庆', '牡丹江', '佳木斯',
  '齐齐哈尔', '呼和浩特', '南宁', '桂林', '北海', '海口', '三亚'
];

function detectLocationInQuery(query) {
  const locationIndicators = ['省', '市', '县', '区', '镇', '村', '街', '路', '道'];
  for (const indicator of locationIndicators) {
    if (query.includes(indicator)) return true;
  }

  for (const city of COMMON_CITIES) {
    if (query.includes(city)) return true;
  }

  const chineseWords = query.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  const dateWeatherWords = [
    '今天', '明天', '后天', '昨天', '前天', '大前天', '大后天',
    '天气', '气温', '温度', '下雨', '晴天', '多云', '阴天', '雪', '雾', '霾',
    '冷', '热', '刮风', '大风', '微风', '风速', '风向', '湿度', '气压',
    '周一', '周二', '周三', '周四', '周五', '周六', '周日', '星期一', '星期二',
    '星期三', '星期四', '星期五', '星期六', '星期日',
    '会不', '会不会', '怎么', '怎么样', '吗', '呢', '吧', '呀', '啊', '哦',
    '测试', '你好', '请问', '帮助', '问题', '回答', '查询', '搜索'
  ];

  for (const word of chineseWords) {
    const isExcluded = dateWeatherWords.some(ex => word.includes(ex));
    if (!isExcluded) {
      const hasCityChar = ['齐', '哈尔', '滨', '口', '门', '港', '岛', '州', '城', '市', '县', '区', '镇', '村', '街', '路', '道', '山', '水', '江', '河', '湖', '海'].some(c => word.includes(c));
      if (hasCityChar || word.length >= 4) {
        return true;
      }
    }
  }

  return false;
}

const tests = [
  '齐齐哈尔',
  '齐齐哈尔在哪里',
  '北京天气怎么样',
  '今天天气',
  '深圳明天会不会下雨',
  '测试',
  ' hello world ',
  '123',
  '哈尔滨',
  '三亚',
  '帮我查一下天气'
];

console.log('测试 detectLocationInQuery:');
for (const query of tests) {
  const result = detectLocationInQuery(query);
  console.log(`"${query}" -> ${result ? '检测到地名' : '未检测到地名'}`);
}
