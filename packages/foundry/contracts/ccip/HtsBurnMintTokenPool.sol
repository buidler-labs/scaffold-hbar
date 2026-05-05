// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IERC20
} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import { ITypeAndVersion } from "@chainlink/contracts-ccip/src/v0.8/shared/interfaces/ITypeAndVersion.sol";
import { Pool } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Pool.sol";
import { TokenPool } from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";
import { HederaResponseCodes } from "../hedera/HederaResponseCodes.sol";
import { HTSBurnMintERC20 } from "./HTSBurnMintERC20.sol";

contract HtsBurnMintTokenPool is TokenPool, ITypeAndVersion {
    string public constant override typeAndVersion = "HtsBurnMintTokenPool 1.0.0";

    address internal constant HTS_PRECOMPILE_ADDRESS = address(0x167);
    bytes4 internal constant ASSOCIATE_TOKEN_SELECTOR = bytes4(keccak256("associateToken(address,address)"));
    uint256 internal constant HTS_MAX_TOKEN_AMOUNT = uint256(uint64(type(int64).max));
    uint256 internal constant HTS_PRECOMPILE_SUCCESS_CODE = uint256(uint32(HederaResponseCodes.SUCCESS));
    uint256 internal constant HTS_ALREADY_ASSOCIATED_CODE =
        uint256(uint32(HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT));

    HTSBurnMintERC20 public immutable htsWrapper;

    error HtsPoolAssociationFailed(uint256 responseCode);
    error HtsPoolApprovalFailed();

    event HtsPoolInitialised(address indexed pool, address indexed wrapper, address indexed htsToken);
    event HtsWrapperApproved(address indexed pool, address indexed wrapper, address indexed htsToken, uint256 amount);

    constructor(
        HTSBurnMintERC20 wrapper,
        uint8 localTokenDecimals,
        address[] memory allowlist,
        address rmnProxy,
        address router
    ) TokenPool(IERC20(address(wrapper)), localTokenDecimals, allowlist, rmnProxy, router) {
        htsWrapper = wrapper;
    }

    function htsNativeToken() external view returns (address) {
        return htsWrapper.htsTokenAddress();
    }

    function initializeHtsPool() external onlyOwner {
        address nativeToken = htsWrapper.htsTokenAddress();

        uint256 responseCode = _associateHtsToken(nativeToken);
        if (responseCode != HTS_PRECOMPILE_SUCCESS_CODE && responseCode != HTS_ALREADY_ASSOCIATED_CODE) {
            revert HtsPoolAssociationFailed(responseCode);
        }

        bool approved = IERC20(nativeToken).approve(address(htsWrapper), HTS_MAX_TOKEN_AMOUNT);
        if (!approved) revert HtsPoolApprovalFailed();

        emit HtsPoolInitialised(address(this), address(htsWrapper), nativeToken);
        emit HtsWrapperApproved(address(this), address(htsWrapper), nativeToken, HTS_MAX_TOKEN_AMOUNT);
    }

    function _associateHtsToken(address nativeToken) internal returns (uint256 responseCode) {
        (bool success, bytes memory result) =
            HTS_PRECOMPILE_ADDRESS.call(abi.encodeWithSelector(ASSOCIATE_TOKEN_SELECTOR, address(this), nativeToken));
        if (!success || result.length < 32) revert HtsPoolAssociationFailed(0);

        return uint256(uint32(abi.decode(result, (int32))));
    }

    function lockOrBurn(Pool.LockOrBurnInV1 calldata lockOrBurnIn)
        external
        virtual
        override
        returns (Pool.LockOrBurnOutV1 memory)
    {
        _validateLockOrBurn(lockOrBurnIn);

        htsWrapper.burn(address(this), lockOrBurnIn.amount);

        emit Burned(msg.sender, lockOrBurnIn.amount);

        return Pool.LockOrBurnOutV1({
            destTokenAddress: getRemoteToken(lockOrBurnIn.remoteChainSelector), destPoolData: _encodeLocalDecimals()
        });
    }

    function releaseOrMint(Pool.ReleaseOrMintInV1 calldata releaseOrMintIn)
        external
        virtual
        override
        returns (Pool.ReleaseOrMintOutV1 memory)
    {
        _validateReleaseOrMint(releaseOrMintIn);

        uint256 localAmount =
            _calculateLocalAmount(releaseOrMintIn.amount, _parseRemoteDecimals(releaseOrMintIn.sourcePoolData));

        htsWrapper.mint(releaseOrMintIn.receiver, localAmount);

        emit Minted(msg.sender, releaseOrMintIn.receiver, localAmount);

        return Pool.ReleaseOrMintOutV1({ destinationAmount: localAmount });
    }
}
