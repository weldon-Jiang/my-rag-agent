try {
    require('./server/sandbox/index.js');
    console.log('sandbox OK');
} catch(e) {
    console.error('sandbox error:', e.message);
}

try {
    require('./server/clarification/index.js');
    console.log('clarification OK');
} catch(e) {
    console.error('clarification error:', e.message);
}

try {
    require('./server/skills/index.js');
    console.log('skills OK');
} catch(e) {
    console.error('skills error:', e.message);
}
