import {config} from './config.js';
import * as ethers from '../libs/ethers.esm.min.js';
const defaultCtrl = (app) =>
  (params) => {
    const calculateProjectDetails = (project) => {
      const now = new Date(new Date().getTime() + (10 * 24 * 60 * 60 * 1000));
      const startDate = new Date(project.startDate * 1000);
      const endDate = new Date(project.endDate * 1000);
      const formattedValue = project.value + ' ' + project.tokenDetails.symbol;
      let valueText = '';
      let num = 0;
      switch(+project.frequency) {
        case 0: // on ended
          if(project.endDate && (endDate.getTime() <= now.getTime())) num = 1;
          valueText = formattedValue + ' at end of project';
          break;
        case 1: // milestone reached
          valueText = 'On milestone reached';
          break;
        case 2: // hourly
          valueText = formattedValue + ' per hour';
          break;
        case 3: //daily
          num = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          valueText = formattedValue + ' per day';
          break;
        case 4: //weekday
          num = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          valueText = formattedValue + ' per weekday';
          break;
        case 5: //weekly
          num = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          valueText = formattedValue + ' per week';
          break;
        case 6: //monthly
          valueText = formattedValue + ' per month';
          break;
        case 7: //quarterly
          num = Math.floor((now.getTime() - startDate.getTime()) / (365 * .25 * 24 * 60 * 60 * 1000));
          valueText = formattedValue + ' per quarter';
          break;
        case 8: //yearly
          num = Math.floor((now.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
          valueText = formattedValue + ' per year';
          break;
      };
      console.log('num', num);
      const total = num * +project.value
      const owed = Math.max(0, total - (+project.deposited - +project.withdrawnClient));
      const withdrawableClient = Math.max(0, +project.deposited - +project.withdrawnClient - +project.withdrawnOwner);
      const withdrawableOwner = Math.max(0, Math.min(total - +project.withdrawnOwner, withdrawableClient));
      return {total,owed,withdrawableClient,withdrawableOwner,num,valueText}
    }
    const fetchTokenDetails = async (tokenAddress, rpayAddress) => {
      const accounts = await ethereum.request({method: 'eth_requestAccounts'});
      const tokenContract = new ethers.Contract(tokenAddress, config.abis.ERC20, config.provider);
      const decimals = await tokenContract.decimals();
      const tokenDetails = {
        symbol: await tokenContract.symbol(),
        name: await tokenContract.name(),
        decimals,
        balance: ethers.utils.formatUnits(await tokenContract.balanceOf(accounts[0]), decimals),
        allowance: !rpayAddress ? 0 : ethers.utils.formatUnits(await tokenContract.allowance(accounts[0], rpayAddress), decimals)
      };
      return tokenDetails;
    }
    const refreshContracts = async () => {
      const accounts = await ethereum.request({method: 'eth_requestAccounts'});
      const masterchefContract = new ethers.Contract(config.MasterchefAddress, config.abis.RPayMasterchef, config.provider);
      const allContracts = await masterchefContract.getContracts();
      console.log(allContracts);
      const ownerContracts = [];
      const clientContracts = [];
      await Promise.all(allContracts.map(async rpayAddress => {
        const rpayContract = new ethers.Contract(rpayAddress, config.abis.RPay, config.provider);
        const data = await rpayContract.isOwnerClientOrProxy(accounts[0]);
        const name = await rpayContract.name();
        const owner = await rpayContract.owner();
        console.log(data, name, owner);
        let projects = [];
        if(data[0]!==0) projects = await rpayContract.getProjects();
        if(data[0]===2) projects = projects.filter(project => project.client.toLowerCase()===data[1].toLowerCase());
        projects = await Promise.all(projects.map(async project => {
          const tokenDetails = await fetchTokenDetails(project.token, rpayAddress);
          return Object.assign({tokenDetails}, project);
        }))
        projects.forEach(project => {
          const decimals = project.tokenDetails.decimals;
          project.contractAddress = rpayAddress;
          project.startDate = ethers.utils.formatUnits(project.startDate, 0);
          project.dueDate = ethers.utils.formatUnits(project.dueDate, 0);
          project.endDate = ethers.utils.formatUnits(project.endDate, 0);
          project.frequency = ethers.utils.formatUnits(project.frequency, 0);
          project.value = ethers.utils.formatUnits(project.value, decimals);
          project.withdrawnClient = ethers.utils.formatUnits(project.withdrawnClient, decimals);
          project.withdrawnOwner = ethers.utils.formatUnits(project.withdrawnOwner, decimals);
          project.deposited = ethers.utils.formatUnits(project.deposited, decimals);
          project.discount = ethers.utils.formatUnits(project.discount, decimals);
          project.accounting = calculateProjectDetails(project);
        });
        if(data[0]===1) ownerContracts.push({address:rpayAddress,name,projects});
        if(data[0]===2) clientContracts.push({address:rpayAddress,name,projects});
      }));
      let listHtml = '';
      if(ownerContracts.length) listHtml += app.$t('owner-contracts', {contracts:ownerContracts});
      if(clientContracts.length) listHtml += app.$t('client-contracts', {contracts:clientContracts});
      app.$('contracts').innerHTML = listHtml;
      console.log('ownerContracts', ownerContracts);
      console.log('clientContracts', clientContracts);
    };
    setTimeout(refreshContracts);
    app.state.newContract = () => {
      app.$('modal').innerHTML = app.$t('modals/new-contract');
      app.$('modal-holder').style.display = 'flex';
    }
    app.state.submitNewContract = async () => {
      event.preventDefault = true;
      event.cancelBubble = true;
      console.log('masterchef', config.MasterchefAddress);
      const masterchefContract = new ethers.Contract(config.MasterchefAddress, config.abis.RPayMasterchef, config.signer);
      console.log('masterchef', config.MasterchefAddress, masterchefContract);
      const name = app.$('modal input[name=name]').value;
      await masterchefContract.newRPay(name);
      app.$('modal-holder').style.display = 'none';
      masterchefContract.once('RPayCreated', (contractAddress, ownerAddress) => {
        console.log('rpay created', contractAddress, ownerAddress);
        refreshContracts();
      })
      return false;
    }
    app.state.newProject = (rpayAddress) => {
      app.state.currentContract = rpayAddress;
      app.$('modal').innerHTML = app.$t('modals/new-project');
      app.$('modal-holder').style.display = 'flex';
    }
    app.state.submitNewProject = async () => {
      event.preventDefault = true;
      event.cancelBubble = true;
      const rpayContract = new ethers.Contract(app.state.currentContract, config.abis.RPay, config.signer);
      const name = app.$('modal input[name=name]').value;
      const meta = app.$('modal input[name=meta]').value || '';
      const startDate = new Date(app.$('modal input[name=startDate]').value).getTime() / 1000;
      const dueDate = new Date(app.$('modal input[name=dueDate]').value || 0).getTime() / 1000;
      const client = app.$('modal input[name=client]').value;
      const clientName = app.$('modal input[name=clientName]').value;
      const token = app.$('modal input[name=token]').value;
      const tokenDetails = await fetchTokenDetails(token);
      const value = ethers.utils.parseUnits(app.$('modal input[name=value]').value, tokenDetails.decimals);
      const frequency = +app.$('modal input[name=frequency]').value;
      await rpayContract.createProject(name, meta, clientName, startDate, dueDate, client, token, value, frequency);
      app.$('modal-holder').style.display = 'none';
      rpayContract.once('ProjectCreated', (projectID) => {
        console.log('project created', projectID);
        refreshContracts();
      })
      return false;
    }
    app.state.approve = async (elm, contractAddress, tokenAddress) => {
      elm.disabled = true;
      const accounts = await ethereum.request({method: 'eth_requestAccounts'});
      const amt = '115792089237316195423570985008687907853269984665640564039339051095349628340968';
      const contract = new ethers.Contract(tokenAddress, config.abis.ERC20, config.signer);
      await contract.approve(contractAddress, amt);
      contract.on('Approval', (owner, spender, value) => {
        if(owner.toLowerCase()===accounts[0].toLowerCase() && spender.toLowerCase()===contractAddress.toLowerCase()) {
          contract.removeAllListeners();
          refreshContracts();
        }
      })
    };
    app.state.deposit = async (elm, contractAddress, projectID, decimals) => {
      app.state.currentContract = contractAddress;
      app.state.currentProject = projectID;
      app.state.currentDecimals = decimals
      elm.disabled = true;
      app.$('modal').innerHTML = app.$t('modals/deposit');
      app.$('modal-holder').style.display = 'flex';
    }
    app.state.submitDeposit = async () => {
      event.preventDefault = true;
      event.cancelBubble = true;
      const rpayContract = new ethers.Contract(app.state.currentContract, config.abis.RPay, config.signer);
      const value = ethers.utils.parseUnits(app.$('modal input[name=value]').value, app.state.currentDecimals);
      try {
        await rpayContract.deposit(app.state.currentProject, value);
        rpayContract.once('Deposit', (projectID, userAddress, value) => {
          console.log('deposit', projectID, userAddress, value);
          refreshContracts();
        })
      } catch (e) {
        console.log(e.data.message.replace('VM Exception while processing transaction: revert ', ''));
      }
      return false;
    }
    app.state.withdrawClient = async (elm, contractAddress, projectID, decimals) => {
      app.state.currentContract = contractAddress;
      app.state.currentProject = projectID;
      app.state.currentDecimals = decimals;
      elm.disabled = true;
      app.$('modal').innerHTML = app.$t('modals/withdraw-client');
      app.$('modal-holder').style.display = 'flex';
    }
    app.state.submitWithdrawClient = async () => {
      event.preventDefault = true;
      event.cancelBubble = true;
      const rpayContract = new ethers.Contract(app.state.currentContract, config.abis.RPay, config.signer);
      const value = ethers.utils.parseUnits(app.$('modal input[name=value]').value, app.state.currentDecimals);
      await rpayContract.withdrawClient(app.state.currentProject, value);
      rpayContract.once('WithdrawClient', (projectID, userAddress, value) => {
        console.log('withdraw client', projectID, userAddress, value);
        refreshContracts();
      })
      return false;
    }
    app.state.withdrawOwner = async (elm, contractAddress, projectID, decimals, num) => {
      app.state.currentContract = contractAddress;
      app.state.currentProject = projectID;
      app.state.currentDecimals = decimals;
      app.state.currentNum = num;
      elm.disabled = true;
      app.$('modal').innerHTML = app.$t('modals/withdraw-owner');
      app.$('modal-holder').style.display = 'flex';
    }
    app.state.submitWithdrawOwner = async () => {
      event.preventDefault = true;
      event.cancelBubble = true;
      const rpayContract = new ethers.Contract(app.state.currentContract, config.abis.RPay, config.signer);
      const value = ethers.utils.parseUnits(app.$('modal input[name=value]').value, app.state.currentDecimals);
      await rpayContract.withdrawOwner(app.state.currentProject, value, app.state.currentNum);
      rpayContract.once('WithdrawOwner', (projectID, userAddress, value) => {
        console.log('withdraw owner', projectID, userAddress, value);
        refreshContracts();
      })
      return false;
    }
  }
export {defaultCtrl};