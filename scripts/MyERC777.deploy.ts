import {ethers} from 'hardhat';
import type {MyERC777__factory} from '../types/typechain';
import constants from '../constants';
import deployERC1820 from './ERC1820.deploy';

/**
 * Deploys an ERC777 contract. Constructor arguments are given from {constants}.
 * @returns address of the deployed contract
 */
export default async function main(): Promise<string> {
  // ERC777 requires ERC1820 to be deployed, this function ensures it
  console.log('\nDeploying ERC1820 registry if not deployed...');
  await deployERC1820((await ethers.getSigners())[0]);

  console.log('\n[MyERC777 Contract]');
  const factory = (await ethers.getContractFactory('MyERC777')) as MyERC777__factory;
  const contract = await factory.deploy(
    constants.MyERC777.name,
    constants.MyERC777.symbol,
    constants.MyERC777.supply,
    []
  );
  await contract.deployed();

  console.log(`\tContract is deployed at ${contract.address}`);
  return contract.address;
}

if (require.main === module) {
  main();
}
