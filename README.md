# Voting Systems

You can buy "membership" of the DAO for 1 eth. Membership will let you make proposals and cast votes.

Members can buy voting power using eth. One "vote" is equal to 1 wei. You can purchase more voting power at any time.

If a member makes a proposal, other members can vote FOR or AGAINST using their voting power.

In order for a proposal to "pass" and be allowed to be executed, at least 25% of total voting power purcahsed must have participated in the vote AND votes FOR must be greater than votes AGAINST. The votes are checked for these conditions at the time of proposal execution.

Once a proposal is made, votes must be made within 7 days and proposal execution must be made within 14 days.

Pitfall of the system is as follows:
if a wealthy member notices that a vote is nearing 25% quorum, the member could simply purchase more voting power to increase the 25% required to execute thereby (potentially) stopping execution.
If there are multiple proposals going at once, and if the DAO has a limited number of ETH to spend on NFTs to purcahse, than the proposal that passes and gets executed first will be executed. The DAO may not have enough funds to execute the second purchase proposal, even if it passes. Maybe this is not so much a system issue, but on the UI side, the members need to know how much funds are remaining in the DAO AND what other proposals are going on at the same time to make their voting decisions.

I choose this system for a couple of reasons:

1. Per the specs, this is a DAO simply to purchase NFTs. Because these are essentially investments and not really social decisions that impact anyone, I saw no reason to go with any kind of voting system that promotes equity by reducing the power of wealthier members.
2. this project was hard and i didn't have time lol

# Design Exersize

1. non transitive delegation

seems like you do this:

make a mapping for purchased voting power and current voting power. both increase as you send more eth to the dao and it represents how much weight your vote is.

mapping (address => uint256) purchasedVotingPower;
mapping (address => uint256) currentVotingPower;

then you make a mapping for delegation

mapping (address => address) delegateVoting;

when a user A delegates their votes to user B the following happens:

delegateVoting[A.address ] = B.address;
currentVotingPower[b.address ] += currentVotingPower[A.address ];
currentVotingPower[A.address ] = 0;

When B votes they use their current voting power. This also allows multiple people to delegate to the same person (but does not allow for proper transitive voting power).

When A wants to undelegate to B, the following happens:

(we can get B.address from the delegateVoting mapping btw)
currentVotingPower[A.address ] += purchasedVotingPower[A.address ];
currentVotingPower[B.address ] -= purchasedVotingPower[A.address ];
delegateVoting[A.address ] = address(0);

I guess the one caviat is that the system needs to stop A from puchasing any more voting power when delegating to anyone.
Also if B wants to delegate to C WHILE A is delegating to B, then C will only get B's purchasedVotingPower.

PS. don't ask me how to delegate for specific proposals only lol

2. transative delegation

The problem i can see with on-chain transitive delegation is a potentially infinite chain of delegations
For example if A delegates to B and B => C, and C => D etc. then when D votes, we have to check a mapping of some sort to see D getting delegated by C, and check the mapping again to see if anyone delegated to C, etc.
If this DAO becomes really popular and 10000s of people are delegating to each other, then gas becomes a problem and execution becomes a problem.
