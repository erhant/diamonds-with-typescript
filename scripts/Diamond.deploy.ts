import {ethers} from 'hardhat';
import {FacetCutAction} from '../libraries/diamond';
import constants from '../constants';
import {IDiamondCut} from '../types/typechain';
import {cutDiamond} from './Diamond.cut';

export async function deployDiamond(ownerAddress: string, diamondCutFacetAddress: string): Promise<string> {
  const factory = await ethers.getContractFactory('Diamond');
  const contract = await factory.deploy(ownerAddress, diamondCutFacetAddress);
  await contract.deployed();
  return contract.address;
}

export async function deployDiamondCutFacet(): Promise<string> {
  const factory = await ethers.getContractFactory('DiamondCutFacet');
  const contract = await factory.deploy();
  await contract.deployed();
  return contract.address;
}

export async function deployDiamondInit(): Promise<string> {
  const factory = await ethers.getContractFactory('DiamondInit');
  const contract = await factory.deploy();
  await contract.deployed();
  return contract.address;
}

export async function deployFacet(facetName: string): Promise<IDiamondCut.FacetCutStruct> {
  const factory = await ethers.getContractFactory(facetName);
  const contract = await factory.deploy();
  await contract.deployed();
  // console.log(`${facetName} deployed: ${contract.address}`);
  return {
    facetAddress: contract.address,
    action: FacetCutAction.Add,
    functionSelectors: Object.keys(contract.interface.functions)
      // ignore existing functions
      .filter(f => f !== 'supportsInterface(bytes4)')
      // map functions to function selectors
      .map(f => contract.interface.getSighash(f)),
  };
}

export default async function main(): Promise<string> {
  const [owner] = await ethers.getSigners();

  // deploy DiamondCutFacet
  const diamondCutFacetAddress = await deployDiamondCutFacet();
  console.log('DiamondCutFacet deployed:', diamondCutFacetAddress);

  // deploy Diamond
  const diamondAddress = await deployDiamond(owner.address, diamondCutFacetAddress);
  console.log('Diamond deployed:', diamondAddress);

  // deploy DiamondInit
  const diamondInitAddress = await deployDiamondInit();
  console.log('DiamondInit deployed:', diamondInitAddress);

  // deploy facets
  console.log('Deploying facets');
  const facetCuts: IDiamondCut.FacetCutStruct[] = [];
  await Promise.all(
    constants.FacetNames.map(async facetName => {
      console.log('\t', facetName);
      const facetCut = await deployFacet(facetName);
      facetCuts.push(facetCut);
    })
  );

  // upgrade diamond with facets & call init function
  console.log('\nDiamond Cuts:', facetCuts);
  cutDiamond(diamondAddress, diamondInitAddress, facetCuts);

  return diamondAddress;
}

if (require.main == module) {
  main().then(() => process.exit(0));
}
