import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import constants from '../constants';

/**
 * Deploys ERC1820 at a specific address, see <https://eips.ethereum.org/EIPS/eip-1820> for more details.
 * Only deploys if there is no code at the specified address.
 * @param issuer from which account the transaction will be issued
 */
export default async function deployERC1820(issuer: SignerWithAddress) {
  const code = await ethers.provider.send('eth_getCode', [constants.ERC1820.address, 'latest']);
  if (code === '0x') {
    await issuer.sendTransaction({
      to: constants.ERC1820.deployer,
      value: constants.ERC1820.value,
    });
    await ethers.provider.send('eth_sendRawTransaction', [constants.ERC1820.payload]);
  }
}
