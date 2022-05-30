import {
  CollectorDAO__factory,
  CollectorDAO,
  NftMarketplace__factory,
  NftMarketplace,
} from "../typechain-types";

import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, BigNumberish, providers } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as NFTMarketplaceABI from "../artifacts/contracts/NFTMarketplace.sol/NftMarketplace.json";
import { BytesLike } from "ethers/lib/utils";
import { createPurchaseNFTCallVars, createSplitSignature } from "./utils";

const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const TEN_ETHER: BigNumber = ethers.utils.parseEther("10");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

const description = "EXAMPLE_PROPOSAL_DESCRIPTION";
const INVALID_FORMAT = "Invalid input format";

describe("CollectorDAO", function () {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let CollectorDAO: CollectorDAO__factory;
  let collectorDao: CollectorDAO;
  let NftMarketplace: NftMarketplace__factory;
  let nftMarketplace: NftMarketplace;

  beforeEach(async () => {
    [deployer, bob, alice] = await ethers.getSigners();
    CollectorDAO = (await ethers.getContractFactory(
      "CollectorDAO"
    )) as CollectorDAO__factory;
    collectorDao = await CollectorDAO.deploy();
    await collectorDao.deployed();
    NftMarketplace = (await ethers.getContractFactory(
      "NftMarketplace"
    )) as NftMarketplace__factory;
    nftMarketplace = await NftMarketplace.deploy();
    await nftMarketplace.deployed();
  });
  it("Allows purchasing voting power", async function () {
    expect(
      await collectorDao.connect(alice).buyVotingPower({ value: ONE_ETHER })
    )
      .to.emit(collectorDao, "VotingPowerPurchased")
      .withArgs(alice.address, ONE_ETHER, ONE_ETHER);
    expect(await collectorDao.connect(alice).getVotingPower()).to.equal(
      ONE_ETHER
    );
  });
  describe("Proposal/vote/execution main flow", () => {
    it("Stores and Executes a proposal with single function call", async function () {
      const { targets, values, callData, NFTIDs } = createPurchaseNFTCallVars(
        1,
        nftMarketplace
      );
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      const tx = await collectorDao
        .connect(alice)
        .propose(targets, values, callData, description);
      const reciept = await tx.wait();
      const proposalCreatedEvent = reciept.events?.filter(
        (x) => x.event === "ProposalCreated"
      );
      const proposalID = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.false;
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao
          .connect(bob)
          .execute(targets, values, callData, description)
      )
        .to.emit(collectorDao, "ProposalExecuted")
        .withArgs(
          proposalID,
          bob.address,
          targets,
          values,
          callData,
          description
        );
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.true;
    });
    it("Stores and Executes a proposal with multiple function calls", async function () {
      const { targets, values, callData, NFTIDs } = createPurchaseNFTCallVars(
        3,
        nftMarketplace
      );
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      const tx = await collectorDao
        .connect(alice)
        .propose(targets, values, callData, description);
      const reciept = await tx.wait();
      const proposalCreatedEvent = reciept.events?.filter(
        (x) => x.event === "ProposalCreated"
      );
      const proposalID = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.false;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[1])).to.be.false;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[2])).to.be.false;
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao
          .connect(bob)
          .execute(targets, values, callData, description)
      )
        .to.emit(collectorDao, "ProposalExecuted")
        .withArgs(
          proposalID,
          bob.address,
          targets,
          values,
          callData,
          description
        );
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[1])).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[2])).to.be.true;
    });
  });
  describe("Proposal", () => {
    it("Needs voting power to create a proposal", async function () {
      const { targets, values, callData } = createPurchaseNFTCallVars(
        1,
        nftMarketplace
      );
      await expect(
        collectorDao
          .connect(alice)
          .propose(targets, values, callData, description)
      ).to.be.revertedWith("Need voting power to propse");
    });
    it("Does not allow incorrect number of targets", async function () {
      const { values, callData } = createPurchaseNFTCallVars(1, nftMarketplace);
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      await expect(
        collectorDao.connect(alice).propose([], values, callData, description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow incorrect number of values", async function () {
      const { targets, callData } = createPurchaseNFTCallVars(
        1,
        nftMarketplace
      );
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      await expect(
        collectorDao.connect(alice).propose(targets, [], callData, description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow incorrect number of callData", async function () {
      const { targets, values } = createPurchaseNFTCallVars(1, nftMarketplace);
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      await expect(
        collectorDao.connect(alice).propose(targets, values, [], description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow empty proposals", async function () {
      const { targets, values, callData } = createPurchaseNFTCallVars(
        0,
        nftMarketplace
      );
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      await expect(
        collectorDao
          .connect(alice)
          .propose(targets, values, callData, description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow re-proposing the same proposal", async function () {
      const { targets, values, callData } = createPurchaseNFTCallVars(
        2,
        nftMarketplace
      );
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      await collectorDao
        .connect(alice)
        .propose(targets, values, callData, description);
      await expect(
        collectorDao
          .connect(alice)
          .propose(targets, values, callData, description)
      ).to.be.revertedWith("Proposal already exists");
    });
  });
  describe("Vote", () => {
    let proposalID: BigNumber;
    beforeEach(async () => {
      const { targets, values, callData } = createPurchaseNFTCallVars(
        3,
        nftMarketplace
      );
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      const tx = await collectorDao
        .connect(alice)
        .propose(targets, values, callData, description);
      const reciept = await tx.wait();
      const proposalCreatedEvent = reciept.events?.filter(
        (x) => x.event === "ProposalCreated"
      );
      proposalID = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
    });
    it("Allows for a vote to be properly cast", async function () {
      let proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(0);
      expect(proposal.votesAgainst).to.equal(0);
      await collectorDao.connect(alice).castVote(proposalID, true);
      proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(TEN_ETHER);
      expect(proposal.votesAgainst).to.equal(0);
      await collectorDao.connect(bob).buyVotingPower({ value: ONE_ETHER });
      await collectorDao.connect(bob).castVote(proposalID, false);
      proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(TEN_ETHER);
      expect(proposal.votesAgainst).to.equal(ONE_ETHER);
    });
    it("Disallows vote when not a member", async function () {
      await expect(
        collectorDao.connect(bob).castVote(proposalID, true)
      ).to.be.revertedWith("Need at least 1 ETH in DAO to vote");
    });
    it("Disallows vote when proposal does not exist", async function () {
      await expect(
        collectorDao.connect(alice).castVote(proposalID.add(1), true)
      ).to.be.revertedWith("Proposal does not exist");
    });
    it("Disallows vote when voting time is over", async function () {
      await timeTravel(10 * SECONDS_IN_DAY);
      await expect(
        collectorDao.connect(alice).castVote(proposalID, true)
      ).to.be.revertedWith("Voting over");
    });
    it("Does not add vote if user has already voted on proposal", async function () {
      await collectorDao.connect(alice).castVote(proposalID, true);
      let proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(TEN_ETHER);
      await collectorDao.connect(alice).castVote(proposalID, true);
      proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(TEN_ETHER);
    });
    it("Emits a VoteCasted event", async function () {
      await expect(collectorDao.connect(alice).castVote(proposalID, true))
        .to.emit(collectorDao, "VoteCasted")
        .withArgs(proposalID, alice.address, TEN_ETHER);
    });
  });
  describe("Execute", () => {
    let proposalID: BigNumber;
    let targets: any;
    let values: any;
    let callData: any;
    let NFTIDs: any;
    beforeEach(async () => {
      ({ targets, values, callData, NFTIDs } = createPurchaseNFTCallVars(
        3,
        nftMarketplace
      ));
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      const tx = await collectorDao
        .connect(alice)
        .propose(targets, values, callData, description);
      const reciept = await tx.wait();
      const proposalCreatedEvent = reciept.events?.filter(
        (x) => x.event === "ProposalCreated"
      );
      proposalID = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
    });
    it("Allows for a pass proposal to be executed", async function () {
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.false;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[1])).to.be.false;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[2])).to.be.false;
      await collectorDao.connect(alice).castVote(proposalID, true);
      await collectorDao.execute(targets, values, callData, description);
      let { executed } = await collectorDao.proposals(proposalID);
      expect(executed).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[1])).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[2])).to.be.true;
    });
    it("Allows for a pass proposal to be executed", async function () {
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.false;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[1])).to.be.false;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[2])).to.be.false;
      await collectorDao.connect(alice).castVote(proposalID, true);
      await collectorDao.execute(targets, values, callData, description);
      let { executed } = await collectorDao.proposals(proposalID);
      expect(executed).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[0])).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[1])).to.be.true;
      expect(await nftMarketplace.purchasedNFTs(NFTIDs[2])).to.be.true;
    });
    it("Does not allow incorrect number of targets", async function () {
      const { values, callData } = createPurchaseNFTCallVars(1, nftMarketplace);
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao.connect(alice).execute([], values, callData, description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow incorrect number of values", async function () {
      const { targets, callData } = createPurchaseNFTCallVars(
        1,
        nftMarketplace
      );
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao.connect(alice).execute(targets, [], callData, description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow incorrect number of callData", async function () {
      const { targets, values } = createPurchaseNFTCallVars(1, nftMarketplace);
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao.connect(alice).execute(targets, values, [], description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow empty proposals", async function () {
      const { targets, values, callData } = createPurchaseNFTCallVars(
        0,
        nftMarketplace
      );
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao
          .connect(alice)
          .execute(targets, values, callData, description)
      ).to.be.revertedWith(INVALID_FORMAT);
    });
    it("Does not allow execution of a non-existant proposal", async function () {
      await collectorDao.connect(alice).castVote(proposalID, true);
      await expect(
        collectorDao
          .connect(alice)
          // changed values paramater to something that is not expected
          .execute(targets, [0, 0, 1], callData, description)
      ).to.be.revertedWith("Does not exist");
    });
    it("Does not allow execution if already executed", async function () {
      await collectorDao.connect(alice).castVote(proposalID, true);
      await collectorDao.execute(targets, values, callData, description);
      await expect(
        collectorDao.execute(targets, values, callData, description)
      ).to.be.revertedWith("Already executed");
    });
    it("Does not allow execution if quorum not reached", async function () {
      await collectorDao.connect(bob).buyVotingPower({ value: ONE_ETHER });
      await collectorDao.connect(bob).castVote(proposalID, true);
      await expect(
        collectorDao.execute(targets, values, callData, description)
      ).to.be.revertedWith("Did not reach quorum");
    });
    it("Does not allow execution votes against > votes in favor", async function () {
      await collectorDao.connect(bob).buyVotingPower({ value: ONE_ETHER });
      await collectorDao.connect(bob).castVote(proposalID, true);
      await collectorDao.connect(alice).castVote(proposalID, false);
      await expect(
        collectorDao.execute(targets, values, callData, description)
      ).to.be.revertedWith("Not enough votes in favor");
    });
    it("Does not allow execution if past execution time", async function () {
      await collectorDao.connect(alice).castVote(proposalID, true);
      await timeTravel(15 * SECONDS_IN_DAY);
      await expect(
        collectorDao.execute(targets, values, callData, description)
      ).to.be.revertedWith("Too late to execute");
    });
  });
  describe("Multi- Verify and Vote", () => {
    let proposalID: BigNumber;
    let targets: any;
    let values: any;
    let callData: any;
    let vs: BigNumberish[] = [];
    let rs: BytesLike[] = [];
    let ss: BytesLike[] = [];
    let signers: string[] = [];
    let proposalIDs: BigNumberish[] = [];
    let isVoteInFavors: boolean[] = [];
    beforeEach(async () => {
      // reset all arrays so they dont get pushed to every loop
      vs = [];
      rs = [];
      ss = [];
      signers = [];
      proposalIDs = [];
      isVoteInFavors = [];
      ({ targets, values, callData } = createPurchaseNFTCallVars(
        3,
        nftMarketplace
      ));
      await collectorDao.connect(alice).buyVotingPower({ value: TEN_ETHER });
      await collectorDao.connect(bob).buyVotingPower({ value: TEN_ETHER });
      const tx = await collectorDao
        .connect(alice)
        .propose(targets, values, callData, description);
      const reciept = await tx.wait();
      const proposalCreatedEvent = reciept.events?.filter(
        (x) => x.event === "ProposalCreated"
      );
      proposalID = proposalCreatedEvent?.[0].args?.[0] as BigNumber;
      const users: SignerWithAddress[] = [bob, alice];
      for (const signer of users) {
        const isVoteInFavor = true;
        const { v, r, s } = await createSplitSignature(
          signer,
          collectorDao,
          proposalID,
          isVoteInFavor
        );
        vs.push(v);
        rs.push(r);
        ss.push(s);
        signers.push(signer.address);
        proposalIDs.push(proposalID);
        isVoteInFavors.push(isVoteInFavor);
      }
    });
    it("Allows multiple verifications and votes at once", async function () {
      let proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(0);
      await collectorDao.multiVerifyAndVote(
        signers,
        proposalIDs,
        isVoteInFavors,
        vs,
        rs,
        ss
      );
      proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(TEN_ETHER.add(TEN_ETHER));
    });
    it("Skips over unverified signer and emits Unverified Signer", async function () {
      let proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(0);
      await expect(
        collectorDao.multiVerifyAndVote(
          // overwrite the default [bob.address, alice.address]
          [bob.address, bob.address],
          proposalIDs,
          isVoteInFavors,
          vs,
          rs,
          ss
        )
      )
        .to.emit(collectorDao, "UnverifiedSigner")
        .withArgs(bob.address, proposalID);
      proposal = await collectorDao.proposals(proposalID);
      expect(proposal.votesInFavor).to.equal(TEN_ETHER);
    });
    it("Does not execute if has wrong number of args", async function () {
      await expect(
        collectorDao.multiVerifyAndVote(
          [],
          proposalIDs,
          isVoteInFavors,
          vs,
          rs,
          ss
        )
      ).to.be.revertedWith(INVALID_FORMAT);
      await expect(
        collectorDao.multiVerifyAndVote(signers, [], isVoteInFavors, vs, rs, ss)
      ).to.be.revertedWith(INVALID_FORMAT);
      await expect(
        collectorDao.multiVerifyAndVote(signers, proposalIDs, [], vs, rs, ss)
      ).to.be.revertedWith(INVALID_FORMAT);
      await expect(
        collectorDao.multiVerifyAndVote(
          signers,
          proposalIDs,
          isVoteInFavors,
          [],
          rs,
          ss
        )
      ).to.be.revertedWith(INVALID_FORMAT);
      await expect(
        collectorDao.multiVerifyAndVote(
          signers,
          proposalIDs,
          isVoteInFavors,
          vs,
          [],
          ss
        )
      ).to.be.revertedWith(INVALID_FORMAT);
      await expect(
        collectorDao.multiVerifyAndVote(
          signers,
          proposalIDs,
          isVoteInFavors,
          vs,
          rs,
          []
        )
      ).to.be.revertedWith(INVALID_FORMAT);
    });
  });
});
