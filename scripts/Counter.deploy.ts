import {ethers} from 'hardhat';
import type {Counter__factory} from '../types/typechain';

/**
 * Deploys a Counter contract.
 * @returns address of the deployed contract
 */
export default async function main(): Promise<string> {
  console.log('\n[Counter Contract]');
  const factory = (await ethers.getContractFactory('Counter')) as Counter__factory;
  const contract = await factory.deploy();
  await contract.deployed();

  console.log(`\tContract is deployed at ${contract.address}`);
  return contract.address;
}

if (require.main === module) {
  main();
}
