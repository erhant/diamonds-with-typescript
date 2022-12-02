import {ethers} from 'hardhat';
import type {MyERC1155__factory} from '../types/typechain';
import constants from '../constants';

/**
 * Deploys an MyERC1155 contract. Constructor arguments are given from {constants}.
 * @returns address of the deployed contract
 */
export default async function main(): Promise<string> {
  console.log('\n[MyERC1155 Contract]');
  const factory = (await ethers.getContractFactory('MyERC1155')) as MyERC1155__factory;
  const contract = await factory.deploy(constants.MyERC1155.URI);
  await contract.deployed();

  console.log(`\tContract is deployed at ${contract.address}`);
  return contract.address;
}

if (require.main === module) {
  main();
}
