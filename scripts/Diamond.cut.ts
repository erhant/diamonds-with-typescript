import {ethers} from 'hardhat';
import {IDiamondCut} from '../types/typechain';

/**
 * Cuts the diamond with the given facet cuts.
 * @param diamondAddress address of Diamond
 * @param diamondInitAddress address of DiamondInitFacet
 * @param facetCuts an array of FacetCutStruct's
 */
export async function cutDiamond(
  diamondAddress: string,
  diamondInitAddress: string,
  facetCuts: IDiamondCut.FacetCutStruct[]
) {
  // connect to diamondCutFacet to call diamondCut
  const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress);

  // also get diamondInit for its interface
  const diamondInit = await ethers.getContractAt('DiamondInit', diamondInitAddress);

  // cut the diamond
  const tx = await diamondCutFacet.diamondCut(
    facetCuts,
    diamondInitAddress,
    diamondInit.interface.encodeFunctionData('init')
  );
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
}
