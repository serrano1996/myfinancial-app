const fs = require('fs');
require('dotenv').config();

const envConfigFile = `export const environment = {
  production: false,
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseKey: '${process.env.SUPABASE_KEY}'
};
`;

const targetPath = './src/environments/environment.ts';
const targetPathDev = './src/environments/environment.development.ts';

fs.mkdirSync('./src/environments', { recursive: true });

fs.writeFile(targetPath, envConfigFile, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log(`Output generated at ${targetPath}`);
    }
});

fs.writeFile(targetPathDev, envConfigFile, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log(`Output generated at ${targetPathDev}`);
    }
});
