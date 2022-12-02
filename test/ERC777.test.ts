import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {MyERC777, MyERC777__factory, MyERC777Recipient, MyERC777Recipient__factory} from '../types/typechain';
import allConstants from '../constants';
import deployERC1820 from '../scripts/ERC1820.deploy';
const constants = allConstants.MyERC777;

describe('ERC777', () => {
  let myERC777: MyERC777;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let operator: SignerWithAddress;

  before(async () => {
    [owner, alice, operator] = await ethers.getSigners();

    // ERC777 requires ERC1820 to be deployed, this function ensures it
    await deployERC1820(owner);

    const erc777Factory = (await ethers.getContractFactory('MyERC777', owner)) as MyERC777__factory;
    myERC777 = await erc777Factory.deploy(constants.name, constants.symbol, constants.supply, [owner.address]);
    await myERC777.deployed();
  });

  describe('deployment', async () => {
    it('should have correct name, symbol, and supply at owner', async () => {
      expect(await myERC777.name()).to.eq(constants.name);
      expect(await myERC777.symbol()).to.eq(constants.symbol);
      expect(await myERC777.balanceOf(owner.address)).to.eq(constants.supply);
    });
  });

  describe('transferring', async () => {
    const amount = ethers.utils.parseEther('10');

    it('should allow transfer of tokens', async () => {
      // transfer from owner to alice
      await expect(myERC777.transfer(alice.address, amount))
        .to.emit(myERC777, 'Transfer')
        .withArgs(owner.address, alice.address, amount);
      expect(await myERC777.balanceOf(alice.address)).to.eq(amount);

      // transfer back
      await expect(myERC777.connect(alice).transfer(owner.address, amount))
        .to.emit(myERC777, 'Transfer')
        .withArgs(alice.address, owner.address, amount);
      expect(await myERC777.balanceOf(alice.address)).to.eq(0);
    });

    it('should NOT allow transfer of insufficient amount', async () => {
      await expect(myERC777.connect(alice).transfer(owner.address, amount)).to.be.revertedWith(
        'ERC777: transfer amount exceeds balance'
      );
    });

    it('should allow approval & transferFrom of tokens', async () => {
      // owner approves alice for the transfer
      await expect(myERC777.approve(alice.address, amount))
        .to.emit(myERC777, 'Approval')
        .withArgs(owner.address, alice.address, amount);

      // alice calls transfer-from
      await expect(myERC777.connect(alice).transferFrom(owner.address, alice.address, amount))
        .to.emit(myERC777, 'Transfer')
        .withArgs(owner.address, alice.address, amount);
      expect(await myERC777.balanceOf(alice.address)).to.eq(amount);

      // transfer back
      await expect(myERC777.connect(alice).transfer(owner.address, amount))
        .to.emit(myERC777, 'Transfer')
        .withArgs(alice.address, owner.address, amount);
      expect(await myERC777.balanceOf(alice.address)).to.eq(0);
    });

    it('should allow burning', async () => {
      const burnData = '0x1234';
      const supply = await myERC777.totalSupply();
      await expect(myERC777.burn(amount, burnData))
        .to.emit(myERC777, 'Burned')
        .withArgs(owner.address, owner.address, amount, burnData, '0x');
      expect(await myERC777.totalSupply()).to.eq(supply.sub(amount));
    });
  });

  describe('transferring via operators', async () => {
    const amount = ethers.utils.parseEther('10');

    it('should authorize operator', async () => {
      expect(await myERC777.isOperatorFor(operator.address, owner.address)).to.eq(false);
      await expect(myERC777.authorizeOperator(operator.address))
        .to.emit(myERC777, 'AuthorizedOperator')
        .withArgs(operator.address, owner.address);
      expect(await myERC777.isOperatorFor(operator.address, owner.address)).to.eq(true);
    });

    it('should allow operator to transfer', async () => {
      // transfer tokens to alice from owner, using the operator authorized by owner
      expect(await myERC777.balanceOf(alice.address)).to.eq(0);
      await expect(myERC777.connect(operator).operatorSend(owner.address, alice.address, amount, '0x', '0x'))
        .to.emit(myERC777, 'Sent')
        .withArgs(operator.address, owner.address, alice.address, amount, '0x', '0x');
      expect(await myERC777.balanceOf(alice.address)).to.eq(amount);
    });

    it('should allow operator to burn', async () => {
      // burn tokens of owner, using the operator authorized by owner
      const supply = await myERC777.totalSupply();
      await expect(myERC777.connect(operator).operatorBurn(owner.address, amount, '0x', '0x'))
        .to.emit(myERC777, 'Burned')
        .withArgs(operator.address, owner.address, amount, '0x', '0x');
      expect(await myERC777.balanceOf(alice.address)).to.eq(amount);
      expect(await myERC777.totalSupply()).to.eq(supply.sub(amount));
    });

    it('should revoke operator', async () => {
      expect(await myERC777.isOperatorFor(operator.address, owner.address)).to.eq(true);
      await expect(myERC777.revokeOperator(operator.address))
        .to.emit(myERC777, 'RevokedOperator')
        .withArgs(operator.address, owner.address);
      expect(await myERC777.isOperatorFor(operator.address, owner.address)).to.eq(false);
    });
  });

  describe('can notify a recipient contract', () => {
    const amount = ethers.utils.parseEther('5');
    let erc777recipient: MyERC777Recipient;

    before(async () => {
      const erc777recipientFactory = (await ethers.getContractFactory(
        'MyERC777Recipient',
        owner
      )) as MyERC777Recipient__factory;
      erc777recipient = await erc777recipientFactory.deploy();
      await erc777recipient.deployed();
    });

    it('should be notified on recieve', async () => {
      expect(await erc777recipient.numTimesReceived()).to.eq(0);

      await expect(myERC777.transfer(erc777recipient.address, amount))
        .to.emit(myERC777, 'Transfer')
        .withArgs(owner.address, erc777recipient.address, amount);
      expect(await myERC777.balanceOf(erc777recipient.address)).to.eq(amount);

      expect(await erc777recipient.numTimesReceived()).to.eq(1);
      expect(await erc777recipient.lastReceivedFrom()).to.eq(owner.address);
    });
  });
});
