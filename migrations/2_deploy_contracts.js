var RPayMasterchef = artifacts.require("RPayMasterchef");
var FROG = artifacts.require("FROG");

module.exports = function(deployer) {
  //deployer.deploy(RPayMasterchef, {overwrite:false});
  deployer.deploy(FROG);
};