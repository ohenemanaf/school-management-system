const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log('Usage: node scripts/configure-deployment.cjs --email YOUR_ADMIN_EMAIL');
    process.exit(0);
}
const email = args[args.indexOf('--email') + 1];
if (!args.includes('--email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || /[\r\n'"$#]/.test(email)) {
    console.error('Provide your administrator email with --email.');
    process.exit(1);
}
const destination = path.resolve(__dirname, '../.env');
const secret = () => crypto.randomBytes(32).toString('hex');
const settings = [
    'APP_BIND=127.0.0.1', 'APP_PORT=8080',
    `DB_PASSWORD=${secret()}`, `MYSQL_ROOT_PASSWORD=${secret()}`,
    `JWT_SECRET=${secret()}`, `ADMIN_EMAIL=${email}`,
    `ADMIN_PASSWORD=${crypto.randomBytes(24).toString('hex')}`,
    'SITE_DOMAIN=', 'SMTP_HOST=', 'SMTP_PORT=587', 'SMTP_SECURE=false', 'SMTP_USER=', 'SMTP_PASS=', ''
].join('\n');
try {
    fs.writeFileSync(destination, settings, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
} catch (error) {
    if (error.code === 'EEXIST') console.error('An .env already exists. It was left unchanged; review it before deployment.');
    else console.error('Could not create the private configuration file.');
    process.exit(1);
}
console.log('Created private .env with generated secrets. Read ADMIN_PASSWORD locally to sign in; do not share this file.');
console.log('Next: docker compose up -d --build');
