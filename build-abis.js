const fs = require('fs');
const glob = require('glob');
const path = require('path');
(async () => {
  glob('./build/contracts/*.json', async (err, files) => {
    await Promise.all(files.map(async file => {
      const json = JSON.parse(await new Promise(res => fs.readFile(file, 'utf-8', (err, data) => res(data))));
      const abi = JSON.stringify(json.abi);
      await new Promise(res => fs.writeFile('./web/abi/' + path.basename(file), abi, 'utf-8', (err) => res()));
    }));
    console.log('abis built');
  })
})()