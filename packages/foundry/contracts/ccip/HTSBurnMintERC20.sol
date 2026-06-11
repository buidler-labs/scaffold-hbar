// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IBurnMintERC20 } from "@chainlink/contracts-ccip/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";
import { IGetCCIPAdmin } from "@chainlink/contracts/src/v0.8/shared/interfaces/IGetCCIPAdmin.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { HederaTokenService } from "../hedera/HederaTokenService.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IHederaTokenService } from "../hedera/IHederaTokenService.sol";
import { KeyHelper } from "../hedera/KeyHelper.sol";

contract HTSBurnMintERC20 is IBurnMintERC20, IGetCCIPAdmin, AccessControl, HederaTokenService, KeyHelper {
    event TokenCreated(address tokenAddress);
    event CCIPAdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    error HtsTokenCreationFailed(int256 responseCode);
    error AmountExceedsInt64(uint256 amount);
    error InvalidRecipient(address recipient);
    error InvalidSender(address sender);
    error InvalidSpender(address spender);
    error InsufficientAllowance(address owner, address spender, uint256 have, uint256 want);
    error HtsCallFailed(int256 responseCode);
    error HtsTransferFailed();

    /// @dev The address of the HTS token that this contract can mint and burn
    address public immutable htsTokenAddress;

    /// @dev Whether the token has a finite total supply or not. This is set at construction and cannot be changed.
    bool public finiteTotalSupplyType = false;

    /// @dev The name of the token
    string private i_name;

    /// @dev The symbol of the token
    string private i_symbol;

    /// @dev The number of decimals for the token
    uint8 internal i_decimals;

    /// @dev the CCIPAdmin can be used to register with the CCIP token admin registry, but has no other special powers,
    /// and can only be transferred by the owner.
    address internal s_ccipAdmin;

    mapping(address owner => mapping(address spender => uint256)) private _allowances;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 preMint) payable {
        i_name = _name;
        i_symbol = _symbol;
        i_decimals = _decimals;
        s_ccipAdmin = msg.sender;

        // Set up the owner as the initial minter and burner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        supplyContract = address(this);
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = getSingleKey(KeyType.SUPPLY, KeyValueType.CONTRACT_ID, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(0, address(this), 8000000);

        IHederaTokenService.HederaToken memory htsTokenConfig;
        htsTokenConfig.name = _name;
        htsTokenConfig.symbol = _symbol;
        htsTokenConfig.treasury = address(this);
        htsTokenConfig.tokenSupplyType = finiteTotalSupplyType;
        htsTokenConfig.freezeDefault = false;
        htsTokenConfig.tokenKeys = keys;
        htsTokenConfig.expiry = expiry;

        (int256 responseCode, address tokenAddress) =
            HederaTokenService.createFungibleToken(htsTokenConfig, 0, int32(int8(int256(uint256(i_decimals)))));

        if (responseCode != HederaTokenService.SUCCESS_CODE) revert HtsTokenCreationFailed(responseCode);

        htsTokenAddress = tokenAddress;

        if (preMint != 0) {
            _mintTo(msg.sender, preMint);
        }

        emit TokenCreated(tokenAddress);
    }

    /*//////////////////////////////////////////////////////////////
                                 ERC20
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns the name of the token.
    function name() external view returns (string memory) {
        return i_name;
    }

    /// @dev Returns the symbol of the token.
    function symbol() external view returns (string memory) {
        return i_symbol;
    }

    /// @dev Returns the number of decimals used in its user representation.
    function decimals() public view returns (uint8) {
        return i_decimals;
    }

    function htsToken() external view returns (address) {
        return htsTokenAddress;
    }

    function totalSupply() external view override returns (uint256) {
        return IERC20(htsTokenAddress).totalSupply();
    }

    function balanceOf(address account) external view override returns (uint256) {
        return IERC20(htsTokenAddress).balanceOf(account);
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        if (to == address(0) || to == address(this)) revert InvalidRecipient(to);
        if (!IERC20(htsTokenAddress).transferFrom(msg.sender, to, amount)) revert HtsTransferFailed();

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        if (spender == address(0)) revert InvalidSpender(spender);
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        if (from == address(0)) revert InvalidSender(from);
        if (to == address(0) || to == address(this)) revert InvalidRecipient(to);

        _spendAllowance(from, msg.sender, amount);
        if (!IERC20(htsTokenAddress).transferFrom(from, to, amount)) revert HtsTransferFailed();

        emit Transfer(from, to, amount);
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                               BURN MINT
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IBurnMintERC20
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
    }

    /// @inheritdoc IBurnMintERC20
    /// @dev Alias for BurnFrom for compatibility with the older naming convention.
    /// @dev Uses burnFrom for all validation & logic.
    function burn(address account, uint256 amount) external override onlyRole(BURNER_ROLE) {
        _burn(account, amount);
    }

    /// @inheritdoc IBurnMintERC20
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(account, amount);
    }

    /// @inheritdoc IBurnMintERC20
    function mint(address account, uint256 amount) external override onlyRole(MINTER_ROLE) {
        _mintTo(account, amount);
    }

    /*//////////////////////////////////////////////////////////////
                                 ROLES
    //////////////////////////////////////////////////////////////*/
    /// @notice grants both mint and burn roles to `burnAndMinter`.
    /// @dev calls public functions so this function does not require
    /// access controls. This is handled in the inner functions.
    function grantMintAndBurnRoles(address burnAndMinter) external {
        grantRole(MINTER_ROLE, burnAndMinter);
        grantRole(BURNER_ROLE, burnAndMinter);
    }

    /// @notice Returns the current CCIPAdmin
    function getCCIPAdmin() external view override returns (address) {
        return s_ccipAdmin;
    }

    /// @notice Transfers the CCIPAdmin role to a new address
    /// @dev only the owner can call this function, NOT the current ccipAdmin, and 1-step ownership transfer is used.
    /// @param newAdmin The address to transfer the CCIPAdmin role to. Setting to address(0) is a valid way to revoke
    /// the role
    function setCCIPAdmin(address newAdmin) public onlyRole(DEFAULT_ADMIN_ROLE) {
        address currentAdmin = s_ccipAdmin;

        s_ccipAdmin = newAdmin;

        emit CCIPAdminTransferred(currentAdmin, newAdmin);
    }

    function _mintTo(address _account, uint256 _amount) internal {
        if (_account == address(0) || _account == address(this)) revert InvalidRecipient(_account);

        int64 amount = _toInt64(_amount);
        (int256 mintResponseCode,,) = mintToken(htsTokenAddress, amount, new bytes[](0));
        _checkResponse(mintResponseCode);

        int256 transferResponseCode = transferToken(htsTokenAddress, address(this), _account, amount);
        _checkResponse(transferResponseCode);

        emit Transfer(address(0), _account, _amount);
    }

    function _burn(address _from, uint256 _amount) internal {
        if (_from == address(0)) revert InvalidSender(_from);

        int64 amount = _toInt64(_amount);
        if (!IERC20(htsTokenAddress).transferFrom(_from, address(this), _amount)) revert HtsTransferFailed();

        (int256 burnResponseCode,) = burnToken(htsTokenAddress, amount, new int64[](0));
        _checkResponse(burnResponseCode);

        emit Transfer(_from, address(0), _amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance == type(uint256).max) return;
        if (currentAllowance < amount) revert InsufficientAllowance(owner, spender, currentAllowance, amount);

        unchecked {
            _allowances[owner][spender] = currentAllowance - amount;
        }

        emit Approval(owner, spender, currentAllowance - amount);
    }

    function _checkResponse(int256 responseCode) internal pure {
        if (responseCode != HederaTokenService.SUCCESS_CODE) revert HtsCallFailed(responseCode);
    }

    function _toInt64(uint256 amount) internal pure returns (int64) {
        if (amount > uint256(uint64(type(int64).max))) revert AmountExceedsInt64(amount);
        return int64(uint64(amount));
    }
}
