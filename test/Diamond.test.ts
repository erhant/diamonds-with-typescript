import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {assert, expect} from 'chai';
import {ethers} from 'hardhat';
import constants from '../constants';
import {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  removeFromSelectors,
  getFromSelectors,
} from '../libraries/diamond';
import {cutDiamond} from '../scripts/Diamond.cut';
import {deployDiamondCutFacet, deployFacet, deployDiamond, deployDiamondInit} from '../scripts/Diamond.deploy';
import {DiamondCutFacet, IDiamondCut, OwnershipFacet, Test2Facet} from '../types/typechain';
import {FoobarFacet} from '../types/typechain/facets/FoobarFacet';
import {Test2FacetInterface} from '../types/typechain/facets/Test2Facet';

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

  // We first deploy each contract separately
  describe('Diamond Deployment', async () => {
    it('should deploy DiamondCutFacet', async () => {
      diamondCutFacetAddress = await deployDiamondCutFacet();
    });

    it('should deploy Diamond', async () => {
      diamondAddress = await deployDiamond(owner.address, diamondCutFacetAddress);
    });

    it('should deploy DiamondInit', async () => {
      diamondInitAddress = await deployDiamondInit();
    });

    constants.FacetNames.forEach(facetName =>
      it('should deploy ' + facetName, async () => {
        const facetCut = await deployFacet(facetName);
        facetCuts.push(facetCut);
        facetNameToAddress[facetName] = facetCut.facetAddress as string;
      })
    );
  });

  // Cutting the diamond will register each facet within the diamond contract
  describe('Diamond Cuts', async () => {
    it('should upgrade diamond via DiamondCutFacet', async () => {
      await cutDiamond(diamondAddress, diamondInitAddress, facetCuts);
    });
  });

  describe('Ownership facet', async () => {
    let ownershipFacet: OwnershipFacet;
    before(async () => {
      ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress);
    });

    it('should give the correct owner', async () => {
      const [owner] = await ethers.getSigners();
      expect(await ownershipFacet.owner()).to.be.eq(owner.address);
    });
  });

  describe('Foobar facet', async () => {
    let foobarFacet: FoobarFacet;
    before(async () => {
      foobarFacet = (await ethers.getContractAt('FoobarFacet', diamondAddress)) as FoobarFacet;
    });

    it('should respond to `callMe`', async () => {
      await expect(foobarFacet.callMe(5)).to.emit(foobarFacet, 'WasCalled').withArgs(owner.address, 5);
    });

    it('should be able ot call `removeMe`', async () => {
      await expect(foobarFacet.removeMe()).to.revertedWith('error: you should have removed me :)');
    });

    it('should remove `removeMe`', async () => {
      await makeCut(
        owner,
        diamondAddress,
        [
          {
            facetAddress: ethers.constants.AddressZero, // TODO: why zero here?
            action: FacetCutAction.Remove,
            functionSelectors: [foobarFacet.interface.getSighash('removeMe()')],
          },
        ],
        ethers.constants.AddressZero
      );
    });

    it('should not be able to call `removeMe`', async () => {
      await expect(foobarFacet.removeMe()).to.be.revertedWith('Diamond: Function does not exist');
    });

    it('should add `removeMe` again', async () => {
      await makeCut(
        owner,
        diamondAddress,
        [
          {
            facetAddress: facetNameToAddress['FoobarFacet'],
            action: FacetCutAction.Add,
            functionSelectors: [foobarFacet.interface.getSighash('removeMe()')],
          },
        ],
        ethers.constants.AddressZero
      );
    });

    it('should be able ot call `removeMe` again', async () => {
      await expect(foobarFacet.removeMe()).to.revertedWith('error: you should have removed me :)');
    });
  });

  /*

  describe('test1 contract facet', async () => {
    let test1Facet: Test1Facet;
    let test1FacetAddress: string;
    let test1FacetInterface: Test1FacetInterface;

    before(async () => {
      // deploy test1facet
      const _test1FacetFactory = await ethers.getContractFactory('Test1Facet');
      const _test1Facet = await _test1FacetFactory.deploy();
      await _test1Facet.deployed();
      test1FacetAddress = _test1Facet.address;
      test1FacetInterface = _test1Facet.interface;

      // connect to it via diamond
      test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress);
    });

    it('should add test1 functions', async () => {
      const selectors = removeFromSelectors(test1FacetInterface, getSelectors(test1FacetInterface), [
        'supportsInterface(bytes4)',
      ]);
      await makeCut(
        diamondCutFacet,
        [
          {
            facetAddress: test1FacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: selectors,
          },
        ],
        ethers.constants.AddressZero
      );
      result = await diamondLoupeFacet.facetFunctionSelectors(test1FacetAddress);
      assert.sameMembers(result, selectors);
    });

    it('should test function call', async () => {
      await test1Facet.test1Func10();
    });

    it('should replace supportsInterface function', async () => {
      const selectors = getFromSelectors(test1FacetInterface, getSelectors(test1FacetInterface), [
        'supportsInterface(bytes4)',
      ]);
      await makeCut(
        diamondCutFacet,
        [
          {
            facetAddress: test1FacetAddress,
            action: FacetCutAction.Replace,
            functionSelectors: selectors,
          },
        ],
        ethers.constants.AddressZero
      );
      result = await diamondLoupeFacet.facetFunctionSelectors(test1FacetAddress);
      assert.sameMembers(result, getSelectors(test1FacetInterface));
    });

    it('should remove some test1 functions', async () => {
      const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()'];
      const selectors = removeFromSelectors(test1FacetInterface, getSelectors(test1FacetInterface), functionsToKeep);
      await makeCut(
        diamondCutFacet,
        [
          {
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: selectors,
          },
        ],
        ethers.constants.AddressZero
      );
      result = await diamondLoupeFacet.facetFunctionSelectors(test1FacetAddress);
      assert.sameMembers(
        result,
        getFromSelectors(test1FacetInterface, getSelectors(test1FacetInterface), functionsToKeep)
      );
    });
  });

  describe('test2 contract facet', async () => {
    let test2Facet: Test2Facet;
    let test2FacetAddress: string;
    let test2FacetInterface: Test2FacetInterface;

    before(async () => {
      // deploy test2facet
      const _Test2Facet = await ethers.getContractFactory('Test2Facet');
      const _test2Facet = await _Test2Facet.deploy();
      await _test2Facet.deployed();
      test2FacetAddress = _test2Facet.address;
      test2FacetInterface = _test2Facet.interface;
      // connect to it via diamond
      test2Facet = await ethers.getContractAt('Test2Facet', diamondAddress);
    });

    it('should add test2 functions', async () => {
      const selectors = getSelectors(test2FacetInterface);
      await makeCut(
        diamondCutFacet,
        [
          {
            facetAddress: test2FacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: selectors,
          },
        ],
        ethers.constants.AddressZero
      );
      result = await diamondLoupeFacet.facetFunctionSelectors(test2FacetAddress);
      assert.sameMembers(result, selectors);
    });

    it('should remove some test2 functions', async () => {
      const functionsToKeep = ['test2Func1()', 'test2Func5()', 'test2Func6()', 'test2Func19()', 'test2Func20()'];
      const selectors = removeFromSelectors(test2FacetInterface, getSelectors(test2FacetInterface), functionsToKeep);
      await makeCut(
        diamondCutFacet,
        [
          {
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: selectors,
          },
        ],
        ethers.constants.AddressZero
      );

      result = await diamondLoupeFacet.facetFunctionSelectors(test2FacetAddress);
      assert.sameMembers(
        result,
        getFromSelectors(test2FacetInterface, getSelectors(test2FacetInterface), functionsToKeep)
      );
    });

    it('should call test2 functions', async () => {
      await test2Facet.test2Func2();
    });
  });

  it("remove all functions and facets except 'diamondCut' and 'facets'", async () => {
    let selectors = [];
    let facets = await diamondLoupeFacet.facets();
    for (let i = 0; i < facets.length; i++) {
      selectors.push(...facets[i].functionSelectors);
    }
    selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)']);
    await makeCut(
      diamondCutFacet,
      [
        {
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero
    );
    facets = await diamondLoupeFacet.facets();
    assert.equal(facets.length, 2);
    assert.equal(facets[0][0], addresses[0]);
    assert.sameMembers(facets[0][1], ['0x1f931c1c']);
    assert.equal(facets[1][0], addresses[1]);
    assert.sameMembers(facets[1][1], ['0x7a0ed627']);
  });

  */
});
