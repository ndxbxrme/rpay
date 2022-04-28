pragma solidity ^0.8.0;
import "./Context.sol";
import "./ERC20.sol";

contract RPay is Context {

  struct ProjectStruct {
    uint projectID;
    string name;
    string clientName;
    string meta;
    uint startDate;
    uint dueDate;
    uint endDate;
    address client;
    address token;
    uint value;
    uint deposited;
    uint withdrawnClient;
    uint withdrawnOwner;
    uint discount;
    uint frequency;
    uint clientApproved;
    bool isEntity;
  }
  
  struct MilestoneStruct {
    uint milestoneID;
    uint projectID;
    string name;
    string meta;
    uint startDate;
    uint dueDate;
    uint endDate;
    uint value;
    uint clientApproved;
    bool isEntity;
  }
  
  struct ProxyStruct {
    address toAddress;
    bool canDeposit;
    bool canWithdraw;
    bool isActive;
  }
  
  address private _owner;
  string private _name;
  uint numProjects;
  mapping (uint => ProjectStruct) projects;
  uint numMilestones;
  mapping (uint => MilestoneStruct) milestones;
  mapping (address => ProxyStruct) proxies;
  
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);  
  event ProjectCreated(uint indexed id);
  event MilestoneCreated(uint indexed id, uint indexed projectID);
  event Deposit(uint indexed projectID, address indexed userAddress, uint indexed value);
  event WithdrawClient(uint indexed projectID, address indexed userAddress, uint indexed value);
  event WithdrawOwner(uint indexed projectID, address indexed userAddress, uint indexed value);
  event AddProxy(address indexed fromAddress, address indexed toAddress);
  event RemoveProxy(address indexed fromAddress, address indexed toAddress);
  
  constructor(address owner, string memory name) {
    _owner = owner;
    _name = name;
  }
  
  function name() public view returns (string memory) {
    return _name;
  }
  
  function owner() public view returns (address) {
    return _owner;
  }
  
  function calculateTotalWithdrawable(uint projectID, uint num) private returns (uint) {
    //check that num is reasonable
    return num * projects[projectID].value;
  }
  
  function createProject(string memory name, string memory meta, string memory clientName, uint startDate, uint dueDate, address client, address token, uint value, uint frequency) public returns (uint projectID) {
    (address toAddress, bool canDeposit, bool canWithdraw) = getProxy(_msgSender());
    require(toAddress == _owner, "Only owner can create a project");
    //only owner or proxy of owner
    projectID = numProjects++;
    ProjectStruct storage p = projects[projectID];
    p.projectID = projectID;
    p.name = name;
    p.clientName = clientName;
    p.meta = meta;
    p.startDate = startDate;
    p.dueDate = dueDate;
    p.client = client;
    p.token = token;
    p.value = value;
    p.frequency = frequency;
    p.isEntity = true;
    emit ProjectCreated(numProjects);
  }
  
  function createMilestone(uint projectID, string calldata name, string calldata meta, uint startDate, uint dueDate, uint value) public returns (uint milestoneID) {
    (address toAddress, bool canDeposit, bool canWithdraw) = getProxy(_msgSender());
    require(toAddress == _owner, "Only owner can create a milestone");
    milestoneID = numMilestones++;
    MilestoneStruct storage m = milestones[milestoneID];
    m.milestoneID = milestoneID;
    m.projectID = projectID;
    m.name = name;
    m.meta = meta;
    m.startDate = startDate;
    m.dueDate = dueDate;
    m.value = value;
    m.isEntity = true;
    emit MilestoneCreated(milestoneID, projectID);
  }
  
  function deposit(uint projectID, uint value) public returns (bool) {
    //only client or proxy of a client that can deposit
    (address toAddress, bool canDeposit, bool canWithdraw) = getProxy(_msgSender());
    require(projects[projectID].isEntity, "Project does not exist");
    require(toAddress==projects[projectID].client, "Only project client can deposit");
    require(canDeposit, "Deposit prohibited");
    //TODO transfer funds
    //does user have enough balance?
    uint userBalance = ERC20(projects[projectID].token).balanceOf(_msgSender());
    require(value <= userBalance, "Not enough funds");
    bool success = ERC20(projects[projectID].token).transferFrom(_msgSender(), address(this), value);
    if(success) {
      emit Deposit(projectID, _msgSender(), value);
      projects[projectID].deposited += value;
    }
    else {
      revert("Error transferring funds");
    }
  }
  
  function withdrawOwner(uint projectID, uint value, uint num) public returns (bool) {
    //only owner or proxy of a owner that can withdraw
    (address toAddress, bool canDeposit, bool canWithdraw) = getProxy(_msgSender());
    require(toAddress == _owner, "Only owner can withdraw");
    require(canWithdraw, "Withdraw prohibited");
    require(projects[projectID].isEntity, "Project does not exist");
    uint totalWithdrawable = calculateTotalWithdrawable(projectID, num) - projects[projectID].withdrawnOwner;
    uint totalAvailable = projects[projectID].deposited - projects[projectID].withdrawnClient - projects[projectID].withdrawnOwner;
    require(value <= totalWithdrawable, "Not allowed");
    require(value <= totalAvailable, "Not enough funds");
    uint contractBalance = ERC20(projects[projectID].token).balanceOf(address(this));
    require(value <= contractBalance, "Not enough funds");
    uint allowance = ERC20(projects[projectID].token).allowance(address(this), address(this));
    if(allowance==0) {
      ERC20(projects[projectID].token).approve(address(this), 115792089237316195423570985008687907853269984665640564039339051095349628340968);
    }
    bool success = ERC20(projects[projectID].token).transferFrom(address(this), _msgSender(), value);
    if(success) {
      emit WithdrawOwner(projectID, _msgSender(), value);
      projects[projectID].withdrawnOwner += value;
    }
    else {
      revert("Error transferring funds");
    }
  }
  
  function withdrawClient(uint projectID, uint value) public returns (bool) {
    //only client or proxy of a client that can withdraw
    (address toAddress, bool canDeposit, bool canWithdraw) = getProxy(_msgSender());
    require(canWithdraw, "Withdraw prohibited");
    require(projects[projectID].isEntity, "Project does not exist");
    ProjectStruct memory project = projects[projectID];
    require(toAddress==project.client, "Only project client can withdraw");
    uint totalWithdrawable = project.deposited - project.withdrawnClient - project.withdrawnOwner;
    require(value <= totalWithdrawable, "Not enough funds");
    //TODO do transfer
    uint contractBalance = ERC20(projects[projectID].token).balanceOf(address(this));
    require(value <= contractBalance, "Not enough funds");
    uint allowance = ERC20(projects[projectID].token).allowance(address(this), address(this));
    if(allowance==0) {
      ERC20(projects[projectID].token).approve(address(this), 115792089237316195423570985008687907853269984665640564039339051095349628340968);
    }
    bool success = ERC20(projects[projectID].token).transferFrom(address(this), _msgSender(), value);
    if(success) {
      emit WithdrawClient(projectID, _msgSender(), value);
      projects[projectID].withdrawnClient += value;
    }
    else {
      revert("Error transferring funds");
    }
  }
  
  function getProjects() public view returns (ProjectStruct[] memory) {
    ProjectStruct[] memory ps = new ProjectStruct[](numProjects);
    for(uint i = 0; i < numProjects; i++) {
      ps[i] = projects[i];
    }
    return ps;
  }
  
  function getMilestones() public view returns (MilestoneStruct[] memory) {
    MilestoneStruct[] memory ms = new MilestoneStruct[](numMilestones);
    for(uint i = 0; i < numMilestones; i++) {
      ms[i] = milestones[i];
    }
    return ms;
  }
  
  function transferOwnership(address newOwner) public {
    require(_owner == _msgSender(), "Caller is not the owner");
    require(newOwner != address(0), "New owner is the zero address");
    _setOwner(newOwner);
  }
  
  function _setOwner(address newOwner) private {
    address oldOwner = _owner;
    _owner = newOwner;
    emit OwnershipTransferred(oldOwner, newOwner);
  }
  
  function addProxy(address proxyAddress, bool canDeposit, bool canWithdraw) public returns (bool) {
    //only owner, client or proxy can proxy
    (uint8 status, address userAddress) = isOwnerClientOrProxy(_msgSender());
    require(status!=0, "Not authorized");
    ProxyStruct storage proxy = proxies[proxyAddress];
    proxy.toAddress = _msgSender();
    proxy.canDeposit = canDeposit;
    proxy.canWithdraw = canWithdraw;
    proxy.isActive = true;
    return true;
  }
  
  function removeProxy(address proxyAddress) public {
    //only owner, client or proxy can proxy
    (uint8 status, address userAddress) = isOwnerClientOrProxy(_msgSender());
    require(status!=0, "Not authorized");
    ProxyStruct storage proxy = proxies[proxyAddress];
    proxy.isActive = false;
  }
  
  function getProxy(address fromAddress) private view returns (address, bool, bool) {
    bool canDeposit = true;
    bool canWithdraw = true;
    address toAddress = fromAddress;
    if(proxies[toAddress].isActive) {
      canDeposit = proxies[toAddress].canDeposit;
      canWithdraw = proxies[toAddress].canWithdraw;
      while(proxies[toAddress].isActive) {
        toAddress = proxies[toAddress].toAddress;
      }
    }
    return (toAddress, canDeposit, canWithdraw);
  }
  
  function isOwnerClientOrProxy(address userAddress) public view returns (uint8, address) {
    (address toAddress, bool canDeposit, bool canWithdraw) = getProxy(userAddress);
    if(toAddress==_owner) {
      return (1, toAddress);
    }
    for(uint i=0; i<numProjects; i++) {
      if(toAddress==projects[i].client) {
        return (2, toAddress);
      }
    }
    return (0, toAddress);
  }
}