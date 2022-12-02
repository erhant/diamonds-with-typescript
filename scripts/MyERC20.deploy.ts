import {ethers} from 'hardhat';
import type {MyERC20__factory} from '../types/typechain';
import constants from '../constants';

/**
 * Deploys an ERC20 contract. Constructor arguments are given from {constants}.
 * @returns address of the deployed contract
 */
export default async function main(): Promise<string> {
  console.log('\n[MyERC20 Contract]');
  const factory = (await ethers.getContractFactory('MyERC20')) as MyERC20__factory;
  const contract = await factory.deploy(constants.MyERC20.name, constants.MyERC20.symbol, constants.MyERC20.supply);
  await contract.deployed();

  console.log(`\tContract is deployed at ${contract.address}`);
  return contract.address;
}

if (require.main === module) {
  main();
}
