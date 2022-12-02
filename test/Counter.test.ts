import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Counter, Counter__factory} from '../types/typechain';

describe('Counter', () => {
  let counter: Counter;
  let owner: SignerWithAddress;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    const factory = (await ethers.getContractFactory('Counter', owner)) as Counter__factory;
    counter = await factory.deploy();
    await counter.deployed();
  });

  describe('deployment', async () => {
    expect(await counter.getCount()).to.eq(0);
    expect(counter.address).to.properAddress;
  });

  describe('count up', async () => {
    it('should count up', async () => {
      await expect(counter.countUp()).to.emit(counter, 'CountedTo').withArgs(1);
      expect(await counter.getCount()).to.eq(1);
    });
  });

  describe('count down', async () => {
    it('should count down', async () => {
      await counter.countUp();
      await expect(counter.countDown()).to.emit(counter, 'CountedTo').withArgs(0);
      expect(await counter.getCount()).to.eq(0);
    });

    it('should NOT count down due to underflow exception', async () => {
      await expect(counter.countDown()).to.be.revertedWithPanic('0x11');
    });
  });
});
