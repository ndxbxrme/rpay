import {TurboMini} from './libs/turbomini.js';
import * as ethers from './libs/ethers.esm.min.js';
import {config} from './components/config.js';
import {defaultCtrl} from './components/default.js';
window.app = TurboMini();
(await app.run(async app => {
  await Promise.all(['default', 'no-metamask', 'connect-wallet', 'switch-chain', 'modals/new-contract', 'modals/new-project', 'owner-contracts', 'client-contracts', 'owner-contract', 'client-contract', 'owner-project', 'client-project'].map(async name => app.template(name, await(await fetch('./components/' + name + '.html')).text())));
  await Promise.all(['RAIN', 'TestContract', 'MyContract', 'RPayMasterchef', 'RPay', 'ERC20'].map(async name => {
    const abi = await(await fetch('./abi/' + name + '.json')).json();
    config.abis[name] = abi.abi || abi;
  }));
  if(!window.ethereum) {
    app.$('page').innerHTML = app.$t('no-metamask');
    await new Promise(res => {});
  }
  if(!window.ethereum.chainId || (window.ethereum.chainId==='0x1')) {
    app.$('page').innerHTML = app.$t('connect-wallet');
    await new Promise(res => {app.doConnect = async () => await ethereum.request({method: 'eth_requestAccounts'}); res() });
  }
  if(parseInt(window.ethereum.chainId, 16)!==config.CHAIN_ID) {
    app.$('page').innerHTML = app.$t('switch-chain');
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: '0x' + config.CHAIN_ID.toString(16)}]
      });
    } catch (switchError) {
      if(switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + config.CHAIN_ID.toString(16),
              chainName: 'RPay',
              rpcUrls: ['http://localhost:7545']
            }]
          });
        } catch (addError) {
          await new Promise(res => {});
        }
      }
    }
  }
  config.provider = new ethers.providers.Web3Provider(ethereum);
  config.signer = config.provider.getSigner();
  app.controller('default', defaultCtrl(app));
})).start();