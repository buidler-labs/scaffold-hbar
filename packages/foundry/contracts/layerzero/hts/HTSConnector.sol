// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { OFTCore } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFTCore.sol";
import { HederaTokenService } from "../../hedera/HederaTokenService.sol";
import { IHederaTokenService } from "../../hedera/IHederaTokenService.sol";
import { KeyHelper } from "../../hedera/KeyHelper.sol";

/**
 * @title HTS Connector
 * @dev HTS Connector is an HTS token that extends the functionality of the OFTCore contract.
 *      When bridging to Hedera the contract creates a native HTS fungible token, sets itself
 *      as the supply-key holder, and routes LayerZero _debit / _credit through HTS mint/burn.
 */
abstract contract HTSConnector is OFTCore, KeyHelper, HederaTokenService {
    address public htsTokenAddress;
    bool public finiteTotalSupplyType = false;
    uint8 internal constant HTS_DECIMALS = 18;

    event TokenCreated(address tokenAddress);

    /**
     * @param _name       The name of the HTS token.
     * @param _symbol     The symbol of the HTS token.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate   The delegate capable of making OApp configurations on the endpoint.
     */
    constructor(string memory _name, string memory _symbol, address _lzEndpoint, address _delegate)
        payable
        OFTCore(HTS_DECIMALS, _lzEndpoint, _delegate)
    {
        supplyContract = address(this);
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = getSingleKey(KeyType.SUPPLY, KeyValueType.CONTRACT_ID, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(0, address(this), 8000000);

        IHederaTokenService.HederaToken memory htsToken;
        htsToken.name = _name;
        htsToken.symbol = _symbol;
        htsToken.treasury = address(this);
        htsToken.tokenSupplyType = finiteTotalSupplyType;
        htsToken.freezeDefault = false;
        htsToken.tokenKeys = keys;
        htsToken.expiry = expiry;

        (int256 responseCode, address tokenAddress) =
            HederaTokenService.createFungibleToken(htsToken, 0, int32(int8(int256(uint256(HTS_DECIMALS)))));
        require(responseCode == HederaTokenService.SUCCESS_CODE, "Failed to create HTS token");

        htsTokenAddress = tokenAddress;

        emit TokenCreated(tokenAddress);
    }

    /**
     * @return The address of the underlying HTS token.
     */
    function token() public view returns (address) {
        return htsTokenAddress;
    }

    /**
     * @notice Users must call `approve(connector, amount)` on the HTS token before calling `send`.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return true;
    }

    /**
     * @dev Burns tokens from `_from`, debiting them for a cross-chain send.
     */
    function _debit(address _from, uint256 _amountLD, uint256 _minAmountLD, uint32 _dstEid)
        internal
        virtual
        override
        returns (uint256 amountSentLD, uint256 amountReceivedLD)
    {
        require(_amountLD <= uint64(type(int64).max), "HTSConnector: amount exceeds int64 safe range");

        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);

        int256 transferResponse =
            HederaTokenService.transferToken(htsTokenAddress, _from, address(this), int64(uint64(amountSentLD)));
        require(transferResponse == HederaTokenService.SUCCESS_CODE, "HTS: Transfer failed");

        (int256 response,) = HederaTokenService.burnToken(htsTokenAddress, int64(uint64(amountSentLD)), new int64[](0));
        require(response == HederaTokenService.SUCCESS_CODE, "HTS: Burn failed");
    }

    /**
     * @dev Mints tokens to `_to`, crediting them from a cross-chain receive.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /*_srcEid*/
    )
        internal
        virtual
        override
        returns (uint256)
    {
        require(_amountLD <= uint64(type(int64).max), "HTSConnector: amount exceeds int64 safe range");

        (int256 response,,) = HederaTokenService.mintToken(htsTokenAddress, int64(uint64(_amountLD)), new bytes[](0));
        require(response == HederaTokenService.SUCCESS_CODE, "HTS: Mint failed");

        int256 transferResponse =
            HederaTokenService.transferToken(htsTokenAddress, address(this), _to, int64(uint64(_amountLD)));
        require(transferResponse == HederaTokenService.SUCCESS_CODE, "HTS: Transfer failed");

        return _amountLD;
    }
}
