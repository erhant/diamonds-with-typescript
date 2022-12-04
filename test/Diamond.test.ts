import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';
import constants from '../constants';
import {cutDiamond} from '../scripts/Diamond.cut';
import {deployDiamondCutFacet, deployFacet, deployDiamond, deployDiamondInit} from '../scripts/Diamond.deploy';
import {FacetCutAction} from '../types/facetCut';
import {IDiamondCut, OwnershipFacet} from '../types/typechain';
import {FoobarFacet} from '../types/typechain/facets/FoobarFacet';

/**
 * Utility function to make a facet cut on the diamond.
 * @param diamondAddress diamond cut facet contract
 * @param facetCuts an array of facet cuts to be made
 * @param init address (?)
 */
async function makeCut(
  signer: SignerWithAddress,
  diamondAddress: string,
  facetCuts: IDiamondCut.FacetCutStruct[],
  init: string
) {
  const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress, signer);
  const tx = await diamondCutFacet.diamondCut(facetCuts, init, '0x', {gasLimit: 800000});
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
}

describe('Diamond', async () => {
  let owner: SignerWithAddress;
  let diamondCutFacetAddress: string;
  let diamondAddress: string;
  let diamondInitAddress: string;
  const facetCuts: IDiamondCut.FacetCutStruct[] = []; // each facet will be recorded here
  const facetNameToAddress: Record<string, string> = {};

  before(async () => {
    [owner] = await ethers.getSigners();
  });

  // first deploy each contract separately
  describe('Diamond Deployment & Cut', async () => {
    it('should deploy DiamondCutFacet', async () => {
      diamondCutFacetAddress = await deployDiamondCutFacet();
    });

    it('should deploy Diamond', async () => {
      diamondAddress = await deployDiamond(owner.address, diamondCutFacetAddress);
    });

    it('should deploy DiamondInit', async () => {
      diamondInitAddress = await deployDiamondInit();
    });

    // deploy facets
    constants.FacetNames.forEach(facetName =>
      it('should deploy ' + facetName, async () => {
        const facetCut = await deployFacet(facetName);
        facetCuts.push(facetCut);
        facetNameToAddress[facetName] = facetCut.facetAddress as string;
      })
    );

    // cut the diamond to register facets at the diamond
    // test each facet independently from that point on
    it('should upgrade Diamond via DiamondCutFacet', async () => {
      await cutDiamond(diamondAddress, diamondInitAddress, facetCuts);
    });
  });

  describe('OwnershipFacet', async () => {
    let ownershipFacet: OwnershipFacet;
    before(async () => {
      // sometimes, you dont' even need to cast typechain overloads the getContractAt within hardhat
      ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress);
    });

    it('should have the correct owner', async () => {
      const [owner] = await ethers.getSigners();
      expect(await ownershipFacet.owner()).to.be.eq(owner.address);
    });
  });

  describe('FoobarFacet', async () => {
    let foobarFacet: FoobarFacet;
    let foobarFacetAddress: string;
    before(async () => {
      // you can cast to the connected facet to use its functions
      foobarFacet = (await ethers.getContractAt('FoobarFacet', diamondAddress)) as FoobarFacet;
      foobarFacetAddress = facetNameToAddress['FoobarFacet'];
    });

    it('should be able to call `callMe`', async () => {
      const number = 5;
      await expect(foobarFacet.callMe(number)).to.emit(foobarFacet, 'WasCalled').withArgs(owner.address, number);
    });

    it('should be able to call `removeMe`', async () => {
      await expect(foobarFacet.removeMe()).to.revertedWith('FoobarFacet: you should have removed me :)');
    });

    it('should remove `removeMe`', async () => {
      await makeCut(
        owner,
        diamondAddress,
        [
          {
            facetAddress: ethers.constants.AddressZero, // remove facet address must be 0x0!
            action: FacetCutAction.Remove,
            functionSelectors: [foobarFacet.interface.getSighash('removeMe()')],
          },
        ],
        ethers.constants.AddressZero
      );

      await expect(foobarFacet.removeMe()).to.be.revertedWith('Diamond: Function does not exist');
    });

    it('should add `removeMe` again', async () => {
      await makeCut(
        owner,
        diamondAddress,
        [
          {
            facetAddress: foobarFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: [foobarFacet.interface.getSighash('removeMe()')],
          },
        ],
        ethers.constants.AddressZero
      );

      await expect(foobarFacet.removeMe()).to.revertedWith('FoobarFacet: you should have removed me :)');
    });

    it('should be able to replace `supportsInterface`', async () => {
      // deadbeef is not supported at first
      expect(await foobarFacet.supportsInterface('0xDEADBEEF')).to.be.false;

      // replace the function
      await makeCut(
        owner,
        diamondAddress,
        [
          {
            facetAddress: foobarFacetAddress,
            action: FacetCutAction.Replace,
            functionSelectors: [foobarFacet.interface.getSighash('supportsInterface(bytes4)')],
          },
        ],
        ethers.constants.AddressZero
      );

      // should now support deadbeef
      expect(await foobarFacet.supportsInterface('0xDEADBEEF')).to.be.true;
    });
  });
});
