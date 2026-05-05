// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// MockHTS
//
// Ultra-minimal Hedera Token Service precompile stub used in the chainlink-local
// CCIP round-trip tests, where we etch it at 0x167 on the "Hedera" fork so
// HtsBurnMintERC20 can be deployed and drive the Burn & Mint flow without
// hitting Hashio / Mirror Node / FFI.
//
// Only the three HTS calls HtsBurnMintERC20 makes are implemented:
//   - createFungibleToken
//   - mintToken
//   - burnToken
//
// For richer unit coverage of the wrapper itself (metadata, supply, supply
// key gating), see HtsBurnMintERC20.t.sol which uses hedera-forking's
// htsSetup() (real HTS emulation).
// ─────────────────────────────────────────────────────────────────────────────

import { IHederaTokenService } from "hedera-forking/IHederaTokenService.sol";
import { HederaResponseCodes } from "hedera-forking/HederaResponseCodes.sol";

contract MockHTS {
    mapping(address token => int64 supply) public totalSupply;
    uint160 private s_nextId = 1031;

    function createFungibleToken(IHederaTokenService.HederaToken memory, int64 initialSupply, int32)
        external
        payable
        returns (int64 rc, address tokenAddress)
    {
        s_nextId++;
        tokenAddress = address(s_nextId);
        totalSupply[tokenAddress] = initialSupply;
        rc = HederaResponseCodes.SUCCESS;
    }

    function mintToken(address token, int64 amount, bytes[] memory)
        external
        returns (int64 rc, int64 newTotalSupply, int64[] memory serials)
    {
        totalSupply[token] += amount;
        newTotalSupply = totalSupply[token];
        serials = new int64[](0);
        rc = HederaResponseCodes.SUCCESS;
    }

    function burnToken(address token, int64 amount, int64[] memory) external returns (int64 rc, int64 newTotalSupply) {
        totalSupply[token] -= amount;
        newTotalSupply = totalSupply[token];
        rc = HederaResponseCodes.SUCCESS;
    }
}
