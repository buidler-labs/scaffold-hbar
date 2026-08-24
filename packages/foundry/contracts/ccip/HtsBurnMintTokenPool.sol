// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ITypeAndVersion } from "@chainlink/contracts/src/v0.8/shared/interfaces/ITypeAndVersion.sol";
import { TokenPool } from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";
import { IERC20 } from "@openzeppelin/contracts@4.8.3/token/ERC20/IERC20.sol";
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

    function _lockOrBurn(uint256 amount) internal override {
        htsWrapper.burn(address(this), amount);
    }

    function _releaseOrMint(address receiver, uint256 amount) internal override {
        htsWrapper.mint(receiver, amount);
    }
}
