import { CollectorDAO } from "./../typechain-types/CollectorDAO";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ethers } from "ethers";
import * as NFTMarketplaceABI from "../artifacts/contracts/NFTMarketplace.sol/NftMarketplace.json";
import { NftMarketplace } from "../typechain-types";

type Vote = {
  proposalID: number;
  isVoteInFavor: boolean;
};

const NFTMarketiFace = new ethers.utils.Interface(NFTMarketplaceABI.abi);

const createMapableArray = (numOfcalls: number) => {
  return Array(numOfcalls).fill(0);
};
export const createPurchaseNFTCallVars = (
  numOfcalls: number,
  nftMarketplace: NftMarketplace
) => {
  const purchaseVars: any = {
    targets: createMapableArray(numOfcalls).map(
      (call) => nftMarketplace.address
    ),
    values: createMapableArray(numOfcalls),
    NFTIDs: createMapableArray(numOfcalls).map((call) =>
      Math.floor(Math.random() * 100)
    ),
  };
  purchaseVars.callData = createMapableArray(numOfcalls).map((call, i) =>
    NFTMarketiFace.encodeFunctionData("buy", [
      ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [purchaseVars.NFTIDs[i]]
      ),
    ])
  );
  return purchaseVars;
};

const types = {
  Vote: [
    { name: "proposalID", type: "uint256" },
    { name: "isVoteInFavor", type: "bool" },
  ],
};
export const createSplitSignature = async (
  signer: SignerWithAddress,
  collectorDao: CollectorDAO,
  proposalID: BigNumber,
  isVoteInFavor: boolean
) => {
  const domain = {
    name: "CollectorDao",
    version: "1",
    chainId: 1,
    verifyingContract: collectorDao.address,
  };
  const vote = {
    proposalID,
    isVoteInFavor,
  };
  const signedMessage = await signer._signTypedData(domain, types, vote);
  return ethers.utils.splitSignature(signedMessage);
};
