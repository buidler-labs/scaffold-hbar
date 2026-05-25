//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";
import { Vm } from "forge-std/Vm.sol";

contract ScaffoldHbarDeploy is Script {
    error InvalidChain();
    error DeployerHasNoBalance();
    error InvalidPrivateKey(string);

    event AnvilSetBalance(address account, uint256 amount);
    event FailedAnvilRequest();

    struct Deployment {
        string name;
        address addr;
    }

    string root;
    string path;
    Deployment[] public deployments;
    uint256 constant ANVIL_BASE_BALANCE = 10000 ether;

    /// @notice The deployer address for every run
    address deployer;

    /// @notice Use this modifier on your run() function on your deploy scripts
    modifier ScaffoldHbarDeployerRunner() {
        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }
        _;
        _stopBroadcast();
        exportDeployments();
    }

    function _startBroadcast() internal returns (address) {
        vm.startBroadcast();
        (, address _deployer,) = vm.readCallers();

        if (block.chainid == 31337 && _deployer.balance == 0) {
            try vm.deal(_deployer, ANVIL_BASE_BALANCE) {
                emit AnvilSetBalance(_deployer, ANVIL_BASE_BALANCE);
            } catch {
                emit FailedAnvilRequest();
            }
        }
        return _deployer;
    }

    function _stopBroadcast() internal {
        vm.stopBroadcast();
    }

    function exportDeployments() internal {
        root = vm.projectRoot();
        path = string.concat(root, "/deployments/");
        string memory chainIdStr = vm.toString(block.chainid);
        path = string.concat(path, string.concat(chainIdStr, ".json"));

        string memory jsonWrite;

        if (vm.exists(path)) {
            string memory existingDeploymentsJson = vm.readFile(path);
            string[] memory keys = vm.parseJsonKeys(existingDeploymentsJson, ".");

            for (uint256 i = 0; i < keys.length; i++) {
                if (_isSameString(keys[i], "networkName")) {
                    continue;
                }

                string memory valuePath = string.concat(".", keys[i]);
                string memory deploymentName = vm.parseJsonString(existingDeploymentsJson, valuePath);

                if (_shouldPreserveExistingDeployment(keys[i], deploymentName)) {
                    vm.serializeString(jsonWrite, keys[i], deploymentName);
                }
            }
        }

        uint256 len = deployments.length;

        for (uint256 i = 0; i < len; i++) {
            vm.serializeString(jsonWrite, vm.toString(deployments[i].addr), deployments[i].name);
        }

        string memory chainName;

        try vm.getChain(block.chainid) returns (Vm.Chain memory chain) {
            chainName = chain.name;
        } catch {
            chainName = findChainName();
        }
        jsonWrite = vm.serializeString(jsonWrite, "networkName", chainName);
        vm.writeJson(jsonWrite, path);
    }

    function _readDeployments() internal view returns (string memory deploymentsJson) {
        string memory deploymentsRoot = vm.projectRoot();
        string memory deploymentsPath =
            string.concat(deploymentsRoot, "/deployments/", vm.toString(block.chainid), ".json");

        return vm.readFile(deploymentsPath);
    }

    function _deploymentAddress(string memory deploymentsJson, string memory deploymentName)
        internal
        pure
        returns (address deployment)
    {
        string[] memory keys = vm.parseJsonKeys(deploymentsJson, ".");

        for (uint256 i = 0; i < keys.length; i++) {
            if (_isSameString(keys[i], "networkName")) {
                continue;
            }

            string memory valuePath = string.concat(".", keys[i]);
            string memory value = vm.parseJsonString(deploymentsJson, valuePath);
            if (_isSameString(value, deploymentName)) {
                return vm.parseAddress(keys[i]);
            }
        }

        revert(string.concat("Deployment not found: ", deploymentName));
    }

    function findChainName() public returns (string memory) {
        uint256 thisChainId = block.chainid;
        string[2][] memory allRpcUrls = vm.rpcUrls();
        for (uint256 i = 0; i < allRpcUrls.length; i++) {
            try vm.createSelectFork(allRpcUrls[i][1]) {
                if (block.chainid == thisChainId) {
                    return allRpcUrls[i][0];
                }
            } catch {
                continue;
            }
        }
        revert InvalidChain();
    }

    function _shouldPreserveExistingDeployment(string memory existingAddress, string memory existingName)
        private
        view
        returns (bool shouldPreserve)
    {
        for (uint256 i = 0; i < deployments.length; i++) {
            if (
                _isSameString(existingAddress, vm.toString(deployments[i].addr))
                    || _isSameString(existingName, deployments[i].name)
            ) {
                return false;
            }
        }

        return true;
    }

    function _isSameString(string memory left, string memory right) internal pure returns (bool isSame) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
