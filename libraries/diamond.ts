import {Interface} from 'ethers/lib/utils';
import {ethers} from 'hardhat';
import {IDiamondCut} from '../types/typechain';

export enum FacetCutAction {
  Add = 0,
  Replace = 1,
  Remove = 2,
}

// get function selectors from ABI
export function getSelectors(intface: Interface): string[] {
  const signatures = Object.keys(intface.functions);
  const selectors = signatures.reduce<string[]>((acc, val) => {
    if (val !== 'init(bytes)') {
      acc.push(intface.getSighash(val));
    }
    return acc;
  }, []);
  return selectors;
}

// get function selector from function signature
export function getSelector(func: string): string {
  const abiInterface = new ethers.utils.Interface([func]);
  return abiInterface.getSighash(ethers.utils.Fragment.from(func));
}

// used with getSelectors to remove selectors from an array of selectors
// functionNames argument is an array of function signatures
export function removeFromSelectors(intface: Interface, selectors: string[], functionNames: string[]): string[] {
  const newSelectors = selectors.filter(v => {
    for (const functionName of functionNames) {
      if (v === intface.getSighash(functionName)) {
        return false;
      }
    }
    return true;
  });
  return newSelectors;
}

// used with getSelectors to get selectors from an array of selectors
// functionNames argument is an array of function signatures
export function getFromSelectors(intface: Interface, selectors: string[], functionNames: string[]): string[] {
  const newSelectors = selectors.filter(v => {
    for (const functionName of functionNames) {
      if (v === intface.getSighash(functionName)) {
        return true;
      }
    }
    return false;
  });
  return newSelectors;
}

// remove selectors using an array of signatures
export function removeSelectors(selectors: string[], signatures: string[]): string[] {
  const iface = new ethers.utils.Interface(signatures.map(v => 'function ' + v));
  const removeSelectors = signatures.map(v => iface.getSighash(v));
  selectors = selectors.filter(v => !removeSelectors.includes(v));
  return selectors;
}

// find a particular address position in the return value of diamondLoupeFacet.facets()
export function findAddressPositionInFacets(facetAddress: string, facets: IDiamondCut.FacetCutStruct[]): number {
  for (let i = 0; i < facets.length; i++) {
    if (facets[i].facetAddress === facetAddress) {
      return i;
    }
  }
  return -1;
}
