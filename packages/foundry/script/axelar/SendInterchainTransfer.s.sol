// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { AddressBytes } from "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressBytes.sol";
import { IInterchainTokenService } from "interchain-token-service/contracts/interfaces/IInterchainTokenService.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";

/// @notice Payable `interchainTransfer` on the **source** chain.
/// @dev The Axelar testnet ITS deployment currently supports the legacy 6-argument overload, so pass empty
///      metadata plus the destination gas value.
contract SendInterchainTransfer is Script, HelperConfig {
    using AddressBytes for address;

    /// @notice Default file read when `run` receives a zero token id.
    string internal constant DEFAULT_TOKENID_FILE = "script/axelar/.tokenid";

    /**
     * @notice Sends tokens through Axelar ITS from the current chain to `destinationAxelarName`.
     * @dev When `tokenId` is zero, the script reads the id persisted by the native Axelar ITS helpers.
     * @param tokenId Axelar ITS token id; pass zero to read `script/axelar/.tokenid`.
     * @param destinationAxelarName Axelar name of the destination chain, for example `hedera` or `ethereum-sepolia`.
     * @param recipient Destination EVM address, encoded for ITS as 20-byte address bytes.
     * @param amount Token amount to transfer, in the token's base units.
     * @param gasValue Cross-chain gas amount forwarded to Axelar for destination execution.
     * @param nativeFee Native value forwarded as `msg.value` to `interchainTransfer`.
     */
    function run(
        bytes32 tokenId,
        string calldata destinationAxelarName,
        address recipient,
        uint256 amount,
        uint256 gasValue,
        uint256 nativeFee
    ) external {
        bytes32 id = tokenId;
        if (id == bytes32(0)) {
            id = vm.parseBytes32(vm.trim(vm.readFile(DEFAULT_TOKENID_FILE)));
        }
        NetworkConfig memory config = getConfigByChainId(block.chainid);
        IInterchainTokenService interchainTokenService = IInterchainTokenService(config.interchainTokenService);
        require(
            interchainTokenService.registeredTokenAddress(id) != address(0),
            "SendInterchainTransfer: token not registered here"
        );

        vm.startBroadcast();
        interchainTokenService.interchainTransfer{ value: nativeFee }(
            id, destinationAxelarName, recipient.toBytes(), amount, bytes(""), gasValue
        );
        vm.stopBroadcast();
        console2.log("interchainTransfer amount:", amount);
    }
}
