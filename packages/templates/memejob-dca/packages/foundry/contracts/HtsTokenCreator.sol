// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IHederaTokenService } from "./interfaces/IHederaTokenService.sol";

/// Creates and mints fungible HTS tokens via the HTS precompile at 0x167.
contract HtsTokenCreator {
    address public constant HTS = 0x0000000000000000000000000000000000000167;

    /// HTS response code for success
    int64 public constant SUCCESS = 22;

    event TokenCreated(address indexed tokenAddress, string name, string symbol);
    event TokenMinted(address indexed tokenAddress, int64 newTotalSupply);

    /// Creates a fungible HTS token. Treasury and initial supply recipient is msg.sender.
    /// Sends msg.value as HBAR to the HTS precompile (required for creation fee).
    /// @param initialSupply In smallest units (e.g. 10000 * 10**decimals for 10000 tokens).
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        uint8 decimals
    ) external payable returns (address tokenAddress) {
        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: msg.sender,
            memo: "",
            tokenSupplyType: false,
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: _defaultTokenKeys(),
            expiry: _defaultExpiry()
        });

        (int64 responseCode, address created) = IHederaTokenService(HTS).createFungibleToken{ value: msg.value }(
            token,
            int64(uint64(initialSupply)),
            int32(uint32(decimals))
        );

        if (responseCode != SUCCESS) {
            revert HtsCreateFailed(responseCode);
        }

        emit TokenCreated(created, name, symbol);
        return created;
    }

    /// Mints additional supply to the token's treasury. Caller must hold supply key.
    function mintToken(address token, uint256 amount) external returns (int64 newTotalSupply) {
        (int64 responseCode, int64 newSupply, ) = IHederaTokenService(HTS).mintToken(
            token,
            int64(uint64(amount)),
            new bytes[](0)
        );

        if (responseCode != SUCCESS) {
            revert HtsMintFailed(responseCode);
        }

        emit TokenMinted(token, newSupply);
        return newSupply;
    }

    /// Supply key (bit 4) set to this contract so mintToken() can be called from the contract.
    function _defaultTokenKeys() internal view returns (IHederaTokenService.TokenKey[] memory) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: 16, // supply key
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(0)
            })
        });
        return keys;
    }

    function _defaultExpiry() internal view returns (IHederaTokenService.Expiry memory) {
        return IHederaTokenService.Expiry({
            second: 0,
            autoRenewAccount: msg.sender,
            autoRenewPeriod: 7890000
        });
    }

    error HtsCreateFailed(int64 responseCode);
    error HtsMintFailed(int64 responseCode);
}
