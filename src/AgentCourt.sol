// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./IERC20.sol";

contract AgentCourt {
    enum Severity {
        Low,
        Medium,
        High
    }

    enum AgentStatus {
        None,
        Active,
        Slashed
    }

    struct AgentProfile {
        address owner;
        string metadataURI;
        uint256 stake;
        uint256 reputation;
        uint256 totalViolations;
        uint256 totalSlashed;
        AgentStatus status;
    }

    struct Violation {
        string violationType;
        Severity severity;
        bytes32 evidenceHash;
        uint256 slashAmount;
        uint256 timestamp;
    }

    error AgentAlreadyRegistered();
    error InvalidStake();
    error InvalidAddress();
    error NotOwner();
    error NotAuthorizedReporter();
    error UnknownAgent();
    error TokenTransferFailed();

    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant LOW_REPUTATION_PENALTY = 5;
    uint256 public constant MEDIUM_REPUTATION_PENALTY = 10;
    uint256 public constant HIGH_REPUTATION_PENALTY = 20;

    IERC20 public immutable usdc;
    address public immutable treasury;
    address public owner;

    uint256 private nextAgentId = 1;
    mapping(uint256 => AgentProfile) private agents;
    mapping(uint256 => Violation[]) private agentViolations;
    mapping(address => uint256) public agentIdOfOwner;
    mapping(address => bool) public authorizedReporters;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        string metadataURI,
        uint256 stake
    );
    event ViolationReported(
        uint256 indexed agentId,
        address indexed reporter,
        string violationType,
        Severity severity,
        bytes32 evidenceHash,
        uint256 slashAmount,
        uint256 timestamp
    );
    event AgentSlashed(uint256 indexed agentId, uint256 slashAmount, uint256 remainingStake);
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 previousReputation,
        uint256 newReputation
    );

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    modifier onlyReporter() {
        if (!authorizedReporters[msg.sender]) {
            revert NotAuthorizedReporter();
        }
        _;
    }

    constructor(IERC20 usdcToken, address treasuryAddress, address initialReporter) {
        if (address(usdcToken) == address(0) || treasuryAddress == address(0)) {
            revert InvalidAddress();
        }
        if (initialReporter == address(0)) {
            revert InvalidAddress();
        }

        usdc = usdcToken;
        treasury = treasuryAddress;
        owner = msg.sender;
        authorizedReporters[initialReporter] = true;
    }

    function setReporter(address reporter, bool allowed) external onlyOwner {
        if (reporter == address(0)) {
            revert InvalidAddress();
        }

        authorizedReporters[reporter] = allowed;
    }

    function registerAgent(
        uint256 stakeAmount,
        string calldata metadataURI
    ) external returns (uint256 agentId) {
        if (stakeAmount == 0) {
            revert InvalidStake();
        }
        if (agentIdOfOwner[msg.sender] != 0) {
            revert AgentAlreadyRegistered();
        }

        if (!_transferFrom(msg.sender, address(this), stakeAmount)) {
            revert TokenTransferFailed();
        }

        agentId = nextAgentId++;
        agentIdOfOwner[msg.sender] = agentId;
        agents[agentId] = AgentProfile({
            owner: msg.sender,
            metadataURI: metadataURI,
            stake: stakeAmount,
            reputation: INITIAL_REPUTATION,
            totalViolations: 0,
            totalSlashed: 0,
            status: AgentStatus.Active
        });

        emit AgentRegistered(agentId, msg.sender, metadataURI, stakeAmount);
    }

    function reportViolation(
        uint256 agentId,
        string calldata violationType,
        Severity severity,
        bytes32 evidenceHash
    ) external onlyReporter returns (uint256 slashAmount) {
        AgentProfile storage agent = agents[agentId];
        if (agent.owner == address(0)) {
            revert UnknownAgent();
        }

        uint256 previousReputation = agent.reputation;
        uint256 timestamp = block.timestamp;

        if (severity == Severity.Low) {
            agent.reputation = _decreaseReputation(agent.reputation, LOW_REPUTATION_PENALTY);
        } else if (severity == Severity.Medium) {
            slashAmount = _calculateSlashAmount(agent.stake, 500);
            agent.reputation = _decreaseReputation(agent.reputation, MEDIUM_REPUTATION_PENALTY);
        } else {
            slashAmount = _calculateSlashAmount(agent.stake, 2000);
            agent.reputation = _decreaseReputation(agent.reputation, HIGH_REPUTATION_PENALTY);
        }

        agent.totalViolations += 1;

        if (slashAmount > 0) {
            agent.stake -= slashAmount;
            agent.totalSlashed += slashAmount;
            if (!_transfer(address(treasury), slashAmount)) {
                revert TokenTransferFailed();
            }
            emit AgentSlashed(agentId, slashAmount, agent.stake);
        }

        if (agent.stake == 0) {
            agent.status = AgentStatus.Slashed;
        }

        agentViolations[agentId].push(
            Violation({
                violationType: violationType,
                severity: severity,
                evidenceHash: evidenceHash,
                slashAmount: slashAmount,
                timestamp: timestamp
            })
        );

        emit ViolationReported(
            agentId,
            msg.sender,
            violationType,
            severity,
            evidenceHash,
            slashAmount,
            timestamp
        );
        emit ReputationUpdated(agentId, previousReputation, agent.reputation);
    }

    function getAgentProfile(uint256 agentId) external view returns (AgentProfile memory) {
        return agents[agentId];
    }

    function getViolationCount(uint256 agentId) external view returns (uint256) {
        return agentViolations[agentId].length;
    }

    function getViolation(
        uint256 agentId,
        uint256 index
    ) external view returns (Violation memory) {
        return agentViolations[agentId][index];
    }

    function _decreaseReputation(
        uint256 currentReputation,
        uint256 penalty
    ) private pure returns (uint256) {
        if (currentReputation <= penalty) {
            return 0;
        }
        return currentReputation - penalty;
    }

    function _calculateSlashAmount(
        uint256 stakeAmount,
        uint256 basisPoints
    ) private pure returns (uint256) {
        if (stakeAmount == 0) {
            return 0;
        }

        uint256 slashAmount = (stakeAmount * basisPoints + 9_999) / 10_000;
        if (slashAmount > stakeAmount) {
            return stakeAmount;
        }

        return slashAmount;
    }

    function _transfer(address to, uint256 amount) private returns (bool) {
        return usdc.transfer(to, amount);
    }

    function _transferFrom(address from, address to, uint256 amount) private returns (bool) {
        return usdc.transferFrom(from, to, amount);
    }
}
