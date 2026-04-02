with open('server/routes/chat.js', 'rb') as f:
    content = f.read()

old = b'/ (?:从现在起 | 从现在开始 | 从此刻起 | 从现在开始起)[，,]? (?:你 | 我就) 叫\\s* ([^\\s，。,]{1,10})/'
new = b'/ (?:从现在起 | 从现在开始 | 从此刻起 | 从现在开始起)[，,]?你叫 ([^\\s，。,]{1,10})/,\n    / (?:从现在起 | 从现在开始 | 从此刻起 | 从现在开始起)[，,]?我就叫 ([^\\s，。,]{1,10})/'

content = content.replace(old, new)

with open('server/routes/chat.js', 'wb') as f:
    f.write(content)

print("Fixed!")
