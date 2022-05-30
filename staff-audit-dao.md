https://github.com/0xMacro/student.brandonjunus/tree/c0cf28c83fc8e7b117450c6a1552e83707847488/dao

Audited By: Gary

# General Comments

Very good quality. Be careful of the reentrancy vulnerability in the execute function.  Always follow the checks-effects-interactions.
I liked how you allowed a single address to have basically multiple membership with additional voting powers.  It is an alternative to
an user joining with multiple addresses. 

Good job with implementing the castVote function.  This will allow contracts to be able to join and vote on proposals.  
The signature verification logic does not handle contract-based signatures (see https://eips.ethereum.org/EIPS/eip-1271). Contracts do 
not have private keys, so they cannot generate the signatures needed to tally vote.  

# Design Exercise

Well thought out answers to both questions. 

# Issues

**[H-1]** Reentrancy vulnerability in execute function

Remember, every non-static function you write should follow [checks-effects-interactions] pattern.
(https://docs.soliditylang.org/en/v0.8.11/security-considerations.html?highlight=interactions#use-the-checks-effects-interactions-pattern).  

Right now in `execute` you are doing interactions before your effects. If you moved line 166 proposalToExecute.executed = true  
to be at the start of the function (and thus followed checks-effects-interactions) that would eliminate the reentrancy-vulnerability. 
You could also use a ReentrancyGuard logic on `execute`

**[Unfinished-Feature-1]** Did not implement NFT-buying functionality in `CollectorDAO`

In the Project Spec it says:

"Even though this DAO has one main purpose, write your proposal system to support calling arbitrary functions, then use this to 
implement the NFT-buying behavior."

However, there is no function that implements the NFT-buying behavior. 

The arbitray function call in `execute` should be calling a public function in `CollectorDAO` that will get the price of the NFT from 
a NFTMarketplace and then call the function to buy the NFT.  It should ensure that the price of the NFT is less than the max price the
DAO is willing to pay for it.  

Your contract calls an external contract based on your tests, but no checks are done on the price and it is only using one 
NftMarketplace.  There are more than one NftMarketplace, and it should be passed as part the the proposal calldata. 

**[Technical Mistake]** Hardcoded chainId to 1, EIP-712 not implemented correctly

Consider changing lines 199-206 to use block.chainid replacing the 1
```
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid, // chain  instead of 1 
                this
            )
```
Since version 8.0 there is a variable in global namespace called block.chainid

**Technical Mistake** NFTs utilizing safe transfer cannot be purchased

Per the ERC721 standard, the safeTransferFrom() method will call onERC721Received() on the calling contract, otherwise throw.  See [EIP-721](https://eips.ethereum.org/EIPS/eip-721) for more detail. CollectorDAO does not implement this method, so any purchases of tokens which utilize safe transfer will fail.

Consider implementing the onERC721Received() method within CollectorDao.sol.

**[Q-1]** Leaving hardhat/console.sol in production project

Your contract imports hardhat/console.sol, which is a development package.

Consider removing hardhat/console.sol from your production code.

**[Q-3]** Missing voteBySig, but does implement vote & bulkVoteBySig

The project spec states “Write a function that allows any address to tally a vote cast by a DAO member using offchain-generated signatures. Then, write a function to do this in bulk.” 

You have a function `multiVerifyAndVote` which is the bulkVoteBySig function. Although you can send only one signature vote through 
this function, technically you did not implement the single vote by sig per spec

**[Q-4]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich documentation for functions, return variables and more. This special form is named the Ethereum Natural Language Specification Format (NatSpec).

It is recommended that Solidity contracts are fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others audit, as well as making your contracts look more standard.

For more info on NatSpec, check out this guide.

Consider annotating your contract code via the NatSpec comment standard.

# Nitpicks

# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | 1 |
| Extra features             | - |
| Vulnerability              | 3 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 2 |

Total: 6

Good job!
