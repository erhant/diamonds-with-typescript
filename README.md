# Diamonds with TypeScript

This repository has implementations and tests for [EIP-2535: Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535) in TypeScript. It uses TypeChain and shows a neat way to call facets via casting:

```typescript
//    contract variable                         facet name     diamond address     cast to contract type
const foobarFacet = (await ethers.getContractAt('FoobarFacet', diamondAddress)) as FoobarFacet;
```

Although you are connected to the `Diamond` contract, the calldata will be formed according to `FoobardFacet` which will cause them to fall into the `fallback` at the diamond, and be routed accordingly.

This repository is complementary to my blog post: ...

## Usage

- `yarn` to install the required packages.
- `yarn compile` to compile the contracts.
- `yarn test` to test the contracts.
- `yarn lint` to lint everything.
- `yarn clean` to clean build artifacts.
- `yarn node:start` to start a Hardhat node on `localhost`.
- `yarn node:run <path>` to run a script at the given path on `localhost`.

## Formatting & Linting

- TypeScript codes are formatted & linted with [GTS](https://github.com/google/gts).
- Contracts are formatted with [Solidity + Hardhat](https://hardhat.org/hardhat-vscode/docs/formatting).
- Contracts are linted with [solhint](https://protofire.github.io/solhint).
