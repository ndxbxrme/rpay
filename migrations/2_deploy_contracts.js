var TestContract = artifacts.require("TestContract");
var RPayMasterchef = artifacts.require("RPayMasterchef");

module.exports = function(deployer) {
  deployer.deploy(TestContract, {overwrite:false});
  deployer.deploy(RPayMasterchef, {overwrite:true});
};