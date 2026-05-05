// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
pragma experimental ABIEncoderV2;

import { KeyHelper } from "../hedera/KeyHelper.sol";
import { HederaTokenService } from "../hedera/HederaTokenService.sol";
import { IHederaTokenService } from "../hedera/IHederaTokenService.sol";

/**
 * @title BridgeHtsToken
 * @notice Base contract for creating a native HTS token used in the Axelar ITS flow on Hedera.
 * @dev Concrete implementations should build the desired Hedera token spec and call
 *      `_createHederaFungible` from their constructor.
 * @custom:deployment Deployment must include enough `msg.value` to cover the Hedera HTS creation fee.
 */
abstract contract BridgeHtsToken is KeyHelper, HederaTokenService {
    /// @notice HTS EVM address used as `HEDERA_BRIDGE_TOKEN` / ITS token address on Hedera.
    address public htsTokenAddress;

    /// @notice Emitted after the Hedera Token Service precompile creates the fungible token.
    /// @param token EVM alias address of the created HTS token.
    event HtsTokenCreated(address indexed token);

    /// @notice Reverts when the Hedera Token Service precompile rejects token creation.
    error BridgeHtsToken__CreateFailed();

    /// @notice Reverts when the Hedera Token Service precompile rejects minting.
    /// @param responseCode HTS response code returned by the precompile.
    error BridgeHtsToken__MintFailed(int256 responseCode);

    /// @notice Reverts when the Hedera Token Service precompile rejects a post-mint transfer.
    /// @param responseCode HTS response code returned by the precompile.
    error BridgeHtsToken__TransferFailed(int256 responseCode);

    /// @notice Returns the created HTS token address to register with Axelar ITS.
    function token() public view returns (address) {
        return htsTokenAddress;
    }

    /**
     * @notice Creates the Hedera fungible token represented by this bridge helper.
     * @dev Sets `htsTokenAddress` and emits. Call once from a concrete `constructor` with your spec.
     * @param spec Hedera Token Service token descriptor, including treasury, keys, memo, and expiry.
     * @param initialTotalSupply Initial HTS supply minted by the precompile at creation time.
     * @param decimals HTS decimal precision.
     */
    function _createHederaFungible(
        IHederaTokenService.HederaToken memory spec,
        int64 initialTotalSupply,
        int32 decimals
    ) internal {
        (int256 code, address created) = createFungibleToken(spec, initialTotalSupply, decimals);
        if (code != SUCCESS_CODE) revert BridgeHtsToken__CreateFailed();
        htsTokenAddress = created;
        emit HtsTokenCreated(created);
    }

    /**
     * @notice Mints HTS supply to this contract and optionally transfers it to `to`.
     * @dev The token must have its supply key set to this contract. Passing `address(this)` leaves minted
     *      supply in the treasury.
     * @param to Recipient of the newly minted amount.
     * @param amount Amount to mint in HTS base units; zero is treated as a no-op.
     */
    function _mintHederaFungibleTo(address to, int64 amount) internal {
        if (amount == 0) return;

        bytes[] memory metadata = new bytes[](0);
        (int256 mintCode,,) = mintToken(htsTokenAddress, amount, metadata);
        if (mintCode != SUCCESS_CODE) revert BridgeHtsToken__MintFailed(mintCode);

        if (to != address(this)) {
            int256 transferCode = transferToken(htsTokenAddress, address(this), to, amount);
            if (transferCode != SUCCESS_CODE) revert BridgeHtsToken__TransferFailed(transferCode);
        }
    }

    /**
     * @notice Builds the default fungible HTS descriptor used by the Axelar Hedera template.
     * @dev Infinite supply, supply key = this contract, treasury = this contract.
     * @param name_ HTS token name.
     * @param symbol_ HTS token symbol.
     * @return Hedera token descriptor ready for `_createHederaFungible`.
     */
    function _defaultHederaSpec(string memory name_, string memory symbol_)
        internal
        view
        returns (IHederaTokenService.HederaToken memory)
    {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: getKeyType(KeyType.SUPPLY),
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: bytes(""),
                ECDSA_secp256k1: bytes(""),
                delegatableContractId: address(0)
            })
        });

        return IHederaTokenService.HederaToken({
            name: name_,
            symbol: symbol_,
            treasury: address(this),
            memo: "",
            tokenSupplyType: false,
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry(0, address(this), defaultAutoRenewPeriod)
        });
    }
}
