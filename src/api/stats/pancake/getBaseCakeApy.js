const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const MasterChef = require('../../../abis/MasterChef.json');
const ERC20 = require('../../../abis/ERC20.json');
const { getPrice } = require('../../../utils/getPrice');
const getTotalStakedInUsd = require('../../../utils/getTotalStakedInUsd');

const web3 = new Web3(process.env.BSC_RPC);

const getBaseCakeApy = async () => {
  const masterChef = '0x73feaa1eE314F8c655E354234017bE2193C9E24E';
  const cake = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
  const oracle = 'coingecko';
  const oracleId = 'pancakeswap-token';

  const yearlyRewardsInUsd = await getYearlyRewardsInUsd(masterChef, oracle, oracleId);
  const totalStakedInUsd = await getTotalStakedInUsd(masterChef, cake, oracle, oracleId);

  return yearlyRewardsInUsd.dividedBy(totalStakedInUsd);
};

const getYearlyRewardsInUsd = async (masterChefAddr, oracle, oracleId) => {
  const fromBlock = await web3.eth.getBlockNumber();
  const toBlock = fromBlock + 1;
  const masterChefContract = new web3.eth.Contract(MasterChef, masterChefAddr);

  const multiplier = new BigNumber(await masterChefContract.methods.getMultiplier(fromBlock, toBlock).call());
  const blockRewards = new BigNumber(await masterChefContract.methods.cakePerBlock().call());

  let { allocPoint } = await masterChefContract.methods.poolInfo(0).call();
  allocPoint = new BigNumber(allocPoint);

  const totalAllocPoint = new BigNumber(await masterChefContract.methods.totalAllocPoint().call());
  const poolBlockRewards = blockRewards.times(multiplier).times(allocPoint).dividedBy(totalAllocPoint);

  const secondsPerBlock = 3;
  const secondsPerYear = 31536000;
  const yearlyRewards = poolBlockRewards.dividedBy(secondsPerBlock).times(secondsPerYear);

  const cakePrice = await getPrice(oracle, oracleId);
  const yearlyRewardsInUsd = yearlyRewards.times(cakePrice).dividedBy('1e18');

  return yearlyRewardsInUsd;
};

module.exports = getBaseCakeApy;