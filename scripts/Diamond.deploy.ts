import {ethers} from 'hardhat';
import constants from '../constants';
import {FacetCutAction} from '../types/facetCut';
import {IDiamondCut} from '../types/typechain';
import {cutDiamond} from './Diamond.cut';

/**
 * Deploys a diamond contract.
 * @param ownerAddress contract owner
 * @param diamondCutFacetAddress address of diamond cut facet
 * @returns address of the deployed Diamond
 */
export async function deployDiamond(ownerAddress: string, diamondCutFacetAddress: string): Promise<string> {
  const factory = await ethers.getContractFactory('Diamond');
  const contract = await factory.deploy(ownerAddress, diamondCutFacetAddress);
  await contract.deployed();
  return contract.address;
}

/**
 * Deploys a DiamondCutFacet. This should be done prior to deploying diamond, as it is required there.
 * @returns address of the deployed DiamondCutFacet.
 */
export async function deployDiamondCutFacet(): Promise<string> {
  const factory = await ethers.getContractFactory('DiamondCutFacet');
  const contract = await factory.deploy();
  await contract.deployed();
  return contract.address;
}

/**
 * Deploys a DiamondInitFacet.
 * @returns address of the deployed DiamondInitFacet
 */
export async function deployDiamondInit(): Promise<string> {
  const factory = await ethers.getContractFactory('DiamondInit');
  const contract = await factory.deploy();
  await contract.deployed();
  return contract.address;
}

/**
 * Deploys a facet with the given name. There should exist a contract with this name.
 * @param facetName facet name
 * @returns A FacetCutStruct, as specified in the IDiamondCut interface. Deployment address
 * can be retrieved from there.
 */
export async function deployFacet(facetName: string): Promise<IDiamondCut.FacetCutStruct> {
  const factory = await ethers.getContractFactory(facetName);
  const contract = await factory.deploy();
  await contract.deployed();
  return {
    facetAddress: contract.address,
    action: FacetCutAction.Add,
    functionSelectors: Object.keys(contract.interface.functions)
      // filter some functions to avoid clashes
      .filter(f => {
        if (f == 'supportsInterface(bytes4)') {
          // there may be multiple of these, only accept that of the DiamondLoupeFacet
          if (facetName == 'DiamondLoupeFacet') {
            return true;
          } else {
            return false;
          }
        }
        return true;
      })
      // map functions to function selectors
      .map(f => contract.interface.getSighash(f)),
  };
}

/**
 * Deploys DiamondCutFacet, Diamond with default owner, DiamondInitFacet,
 * as well as facets specified in constants file.
 * @returns address of the Diamond contract.
 */
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
  main().then(() => console.log('Done'));
}
