// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentCourt} from "../src/AgentCourt.sol";
import {IERC20} from "../src/IERC20.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract AgentCourtTest is Test {
    MockUSDC private usdc;
    AgentCourt private court;

    address private treasury = address(0xCAFE);
    address private reporter = address(0xBEEF);
    address private agentOwner = address(0xA11CE);
    address private agentAddressOne = address(0x1111);
    address private agentAddressTwo = address(0x2222);
    address private outsider = address(0xD00D);

    function setUp() public {
        usdc = new MockUSDC();
        court = new AgentCourt(IERC20(address(usdc)), treasury, reporter);
        usdc.mint(agentOwner, 1_000_000e6);
    }

    function testRegisterAgentStoresProfileAndInitialReputation() public {
        _registerAgent(agentAddressOne, 100_000e6, "ipfs://agent-profile");

        uint256 agentId = court.agentIdOfAgentAddress(agentAddressOne);
        AgentCourt.AgentProfile memory profile = court.getAgentProfile(agentId);

        assertEq(profile.owner, agentOwner);
        assertEq(profile.metadataURI, "ipfs://agent-profile");
        assertEq(profile.stake, 100_000e6);
        assertEq(profile.reputation, 100);
        assertEq(profile.totalViolations, 0);
        assertEq(profile.totalSlashed, 0);
        assertEq(uint256(profile.status), uint256(AgentCourt.AgentStatus.Active));
        assertEq(court.getViolationCount(agentId), 0);
    }

    function testSameWalletCanRegisterMultipleAgentAddresses() public {
        uint256 firstAgentId = _registerAgent(agentAddressOne, 100_000e6, "ipfs://agent-one");
        uint256 secondAgentId = _registerAgent(agentAddressTwo, 150_000e6, "ipfs://agent-two");

        assertEq(court.agentIdOfAgentAddress(agentAddressOne), firstAgentId);
        assertEq(court.agentIdOfAgentAddress(agentAddressTwo), secondAgentId);
        assertEq(court.getAgentProfile(firstAgentId).owner, agentOwner);
        assertEq(court.getAgentProfile(secondAgentId).owner, agentOwner);
    }

    function testLowSeverityReducesReputationOnly() public {
        uint256 agentId = _registerAgent(agentAddressOne, 100_000e6, "ipfs://low-severity");
        vm.warp(1_700_000_000);

        vm.prank(reporter);
        court.reportViolation(
            agentId,
            "prompt-injection",
            AgentCourt.Severity.Low,
            keccak256("low-evidence")
        );

        AgentCourt.AgentProfile memory profile = court.getAgentProfile(agentId);
        AgentCourt.Violation memory violation = court.getViolation(agentId, 0);

        assertEq(profile.stake, 100_000e6);
        assertEq(profile.reputation, 95);
        assertEq(profile.totalViolations, 1);
        assertEq(profile.totalSlashed, 0);
        assertEq(uint256(profile.status), uint256(AgentCourt.AgentStatus.Active));
        assertEq(court.getViolationCount(agentId), 1);
        assertEq(violation.violationType, "prompt-injection");
        assertEq(uint256(violation.severity), uint256(AgentCourt.Severity.Low));
        assertEq(violation.evidenceHash, keccak256("low-evidence"));
        assertEq(violation.slashAmount, 0);
        assertEq(violation.timestamp, 1_700_000_000);
    }

    function testMediumSeveritySlashesFivePercentOfStake() public {
        uint256 agentId = _registerAgent(agentAddressOne, 100_000e6, "ipfs://medium-severity");
        vm.warp(1_700_000_100);

        vm.prank(reporter);
        uint256 slashAmount = court.reportViolation(
            agentId,
            "unauthorized-access",
            AgentCourt.Severity.Medium,
            keccak256("medium-evidence")
        );

        AgentCourt.AgentProfile memory profile = court.getAgentProfile(agentId);
        AgentCourt.Violation memory violation = court.getViolation(agentId, 0);

        assertEq(slashAmount, 5_000e6);
        assertEq(profile.stake, 95_000e6);
        assertEq(profile.reputation, 90);
        assertEq(profile.totalViolations, 1);
        assertEq(profile.totalSlashed, 5_000e6);
        assertEq(violation.slashAmount, 5_000e6);
        assertEq(uint256(profile.status), uint256(AgentCourt.AgentStatus.Active));
        assertEq(usdc.balanceOf(treasury), 5_000e6);
    }

    function testHighSeveritySlashesTwentyPercentOfStake() public {
        uint256 agentId = _registerAgent(agentAddressOne, 100_000e6, "ipfs://high-severity");
        vm.warp(1_700_000_200);

        vm.prank(reporter);
        uint256 slashAmount = court.reportViolation(
            agentId,
            "data-exfiltration",
            AgentCourt.Severity.High,
            keccak256("high-evidence")
        );

        AgentCourt.AgentProfile memory profile = court.getAgentProfile(agentId);
        AgentCourt.Violation memory violation = court.getViolation(agentId, 0);

        assertEq(slashAmount, 20_000e6);
        assertEq(profile.stake, 80_000e6);
        assertEq(profile.reputation, 80);
        assertEq(profile.totalViolations, 1);
        assertEq(profile.totalSlashed, 20_000e6);
        assertEq(violation.slashAmount, 20_000e6);
        assertEq(uint256(profile.status), uint256(AgentCourt.AgentStatus.Active));
        assertEq(usdc.balanceOf(treasury), 20_000e6);
    }

    function testOnlyAuthorizedReporterCanReportViolations() public {
        uint256 agentId = _registerAgent(agentAddressOne, 100_000e6, "ipfs://auth-check");

        vm.prank(outsider);
        (bool success,) = address(court).call(
            abi.encodeWithSelector(
                court.reportViolation.selector,
                agentId,
                "policy-breach",
                AgentCourt.Severity.Low,
                keccak256("unauthorized")
            )
        );

        assertFalse(success);
    }

    function _registerAgent(
        address agentAddress,
        uint256 stakeAmount,
        string memory metadataURI
    ) private returns (uint256 agentId) {
        vm.prank(agentOwner);
        usdc.approve(address(court), stakeAmount);
        vm.prank(agentOwner);
        agentId = court.registerAgent(agentAddress, stakeAmount, metadataURI);
    }
}
