import {ethers} from 'hardhat';
import {getSelectors, FacetCutAction} from '../libraries/diamond';
import constants from '../constants';
import {IDiamondCut} from '../types/typechain';

export default async function main(): Promise<string> {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet');
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();
  console.log('DiamondCutFacet deployed:', diamondCutFacet.address);

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('Diamond');
  const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address);
  await diamond.deployed();
  console.log('Diamond deployed:', diamond.address);

  // deploy DiamondInit
  const DiamondInit = await ethers.getContractFactory('DiamondInit');
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();
  console.log('DiamondInit deployed:', diamondInit.address);

  // deploy facets
  console.log('Deploying facets');
  const facetCuts: IDiamondCut.FacetCutStruct[] = [];
  for (const facetName of constants.FacetNames) {
    const Facet = await ethers.getContractFactory(facetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    console.log(`${facetName} deployed: ${facet.address}`);
    facetCuts.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // upgrade diamond with facets
  console.log('\nDiamond Cuts:', facetCuts);
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address);

  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData('init');
  const tx = await diamondCut.diamondCut(facetCuts, diamondInit.address, functionCall);
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log('Completed diamond cut');
  return diamond.address;
}

if (require.main == module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
