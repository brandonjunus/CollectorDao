# MicroAudit DAO - Brandon Junus
Timeframe: `04/25/2022 - 04/29/2022`
Auditor: [Andreas Bigger](https://twitter.com/andreasbigger)
Commit Hash: [`c0cf28c83fc8e7b117450c6a1552e83707847488`](https://github.com/ShipyardDAO/student.brandonjunus/commit/c0cf28c83fc8e7b117450c6a1552e83707847488)
Scope: [contracts/*](https://github.com/ShipyardDAO/student.brandonjunus/tree/master/dao/contracts)


### Categorization

_NOTE: x is the # category issue found._

`[H-x]` - High Severity
`[M-x]` - Medium Severity
`[L-x]` - Low Severity
`[Q-x]` - Code Quality


## [M-0]: Broken Signature Verification on Non-Mainnet
Severity: *Medium Severity*
Likelihood: *Medium*
Status: {Submitted}
Scope: [CollectorDAO.sol](https://github.com/ShipyardDAO/student.brandonjunus/blob/master/dao/contracts/CollectorDAO.sol#L204)

Since the chain id is hard coded to 1 in the domain separator hash in `verify()`, this will break on any chain that does not have id 1. Concretely, this means any vote casting using signatures will break.

![CollectorDAO:verify](https://i.imgur.com/rmlb0Mo.png)
Source: [_CollectorDAO.sol_](https://github.com/ShipyardDAO/student.brandonjunus/blob/master/dao/contracts/CollectorDAO.sol)

**Recommendation**: Dynamically grab the chain id using inline assembly. Consider:
```solidity=
uint256 chainId;
assembly { chainId := chainid() }
bytes32 domainSeparator = keccak256(
    abi.encode(
        DOMAIN_TYPEHASH,
        keccak256(bytes(NAME)),
        keccak256(bytes(VERSION)),
        chainId,
        this
    )
);
```


## [L-0]: Unsupported Contract Signing
Severity: *Low Severity*
Likelihood: *Medium*
Status: {Submitted}
Scope: [CollectorDAO.sol](https://github.com/ShipyardDAO/student.brandonjunus/blob/master/dao/contracts/CollectorDAO.sol#L191-L216)

`CollectorDAO` only supports [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signatures using `ecrecover` which does not work for contracts since they do not have an associated private key for signing messages. Any "smart-wallet", or contract in general, will not be able to join the CollectorDAO.


![CollectorDAO:verify](https://i.imgur.com/S2x11R4.png)
Source: [_CollectorDAO.sol_](https://github.com/ShipyardDAO/student.brandonjunus/blob/master/dao/contracts/CollectorDAO.sol)

**Recommendation**: Add support for [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) (aka contract signing).

## [Q-0]: Index Sparse Event Arguments
Severity: *Code Quality*
Likelihood: *High*
Status: {Submitted}
Scope: [CollectorDAO.sol](https://github.com/ShipyardDAO/student.brandonjunus/blob/master/dao/contracts/CollectorDAO.sol#L249-L275)

`CollectorDAO` events are not indexed at all, making it very difficult for a front-end to query for logs and increases RPC load. 


![CollectorDAO Events](https://i.imgur.com/fcgL6Ho.png)
Source: [_CollectorDAO.sol_](https://github.com/ShipyardDAO/student.brandonjunus/blob/master/dao/contracts/CollectorDAO.sol)

**Recommendation**: Add the `indexed` decorator to sparse event fields like `proposalID` and `creator`/`voter`.
