import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {MyERC20, MyERC20__factory} from '../types/typechain';
import allConstants from '../constants';
const constants = allConstants.MyERC20;

describe('ERC20', () => {
  let myERC20: MyERC20;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;

  before(async () => {
    [owner, alice] = await ethers.getSigners();
    const erc20Factory = (await ethers.getContractFactory('MyERC20', owner)) as MyERC20__factory;
    myERC20 = await erc20Factory.deploy(constants.name, constants.symbol, constants.supply);
    await myERC20.deployed();
  });

  describe('deployment', async () => {
    it('should have correct name, symbol, and supply at owner', async () => {
      expect(await myERC20.name()).to.eq(constants.name);
      expect(await myERC20.symbol()).to.eq(constants.symbol);
      expect(await myERC20.decimals()).to.eq(18);
      expect(await myERC20.balanceOf(owner.address)).to.eq(constants.supply);
    });
  });

  describe('transferring', async () => {
    const amount = ethers.utils.parseEther('10');

    it('should allow transfer of tokens', async () => {
      // transfer from owner to alice
      await expect(myERC20.transfer(alice.address, amount))
        .to.emit(myERC20, 'Transfer')
        .withArgs(owner.address, alice.address, amount);
      expect(await myERC20.balanceOf(alice.address)).to.eq(amount);

      // transfer back
      await expect(myERC20.connect(alice).transfer(owner.address, amount))
        .to.emit(myERC20, 'Transfer')
        .withArgs(alice.address, owner.address, amount);
      expect(await myERC20.balanceOf(alice.address)).to.eq(0);
    });

    it('should NOT allow transfer of insufficient amount', async () => {
      await expect(myERC20.connect(alice).transfer(owner.address, amount)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('should allow approval & transferFrom of tokens', async () => {
      // owner approves alice for the transfer
      await expect(myERC20.approve(alice.address, amount))
        .to.emit(myERC20, 'Approval')
        .withArgs(owner.address, alice.address, amount);

      // alice calls transfer-from
      await expect(myERC20.connect(alice).transferFrom(owner.address, alice.address, amount))
        .to.emit(myERC20, 'Transfer')
        .withArgs(owner.address, alice.address, amount);
      expect(await myERC20.balanceOf(alice.address)).to.eq(amount);

      // transfer back
      await expect(myERC20.connect(alice).transfer(owner.address, amount))
        .to.emit(myERC20, 'Transfer')
        .withArgs(alice.address, owner.address, amount);
      expect(await myERC20.balanceOf(alice.address)).to.eq(0);
    });
  });
});
