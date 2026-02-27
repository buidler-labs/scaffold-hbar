import { expect } from "chai";
import { ethers } from "hardhat";

describe("HtsTokenCreator", function () {
  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();
    const HtsTokenCreator = await ethers.getContractFactory("HtsTokenCreator");
    const creator = await HtsTokenCreator.deploy();
    await creator.waitForDeployment();
    return { creator, owner, alice };
  }

  // HTS uses int64 for supply; max is 2^63-1. Use 6 decimals so 10000 tokens = 1e10 fits.
  const DECIMALS = 6;
  const parseHtsUnits = (amount: string, decimals: number = DECIMALS) =>
    ethers.parseUnits(amount, decimals);
  // HTS createToken requires HBAR for creation fee; send 1 HBAR (10^8 tinybars/wei) in tests.
  const HTS_CREATE_VALUE = 100_000_000n;

  describe("createToken", function () {
    it("should create a fungible HTS token and return non-zero address", async function () {
      const { creator, owner } = await deployFixture();
      const name = "Test HTS Token";
      const symbol = "THT";
      const initialSupply = parseHtsUnits("10000");
      const decimals = DECIMALS;

      const tokenAddress = await creator.createToken(name, symbol, initialSupply, decimals, {
        value: HTS_CREATE_VALUE,
      });
      expect(tokenAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should set caller as treasury", async function () {
      const { creator, owner } = await deployFixture();
      const initialSupply = parseHtsUnits("1000");
      const tokenAddress = await creator.connect(owner).createToken(
        "Treasury Token",
        "TRS",
        initialSupply,
        DECIMALS,
        { value: HTS_CREATE_VALUE },
      );
      expect(tokenAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("mintToken", function () {
    it("should mint additional supply to token treasury", async function () {
      const { creator, owner } = await deployFixture();
      const initialSupply = parseHtsUnits("1000");
      const tokenAddress = await creator.createToken.staticCall(
        "Mintable Token",
        "MNT",
        initialSupply,
        DECIMALS,
        { value: HTS_CREATE_VALUE },
      );
      await creator.createToken(
        "Mintable Token",
        "MNT",
        initialSupply,
        DECIMALS,
        { value: HTS_CREATE_VALUE },
      );

      const mintAmount = parseHtsUnits("500");
      const newTotalSupply = await creator.mintToken.staticCall(tokenAddress, mintAmount);
      expect(newTotalSupply > 0n).to.be.true;
      await creator.mintToken(tokenAddress, mintAmount);

      const secondMintSupply = await creator.mintToken.staticCall(tokenAddress, mintAmount);
      await expect(creator.mintToken(tokenAddress, mintAmount))
        .to.emit(creator, "TokenMinted")
        .withArgs(tokenAddress, secondMintSupply);
    });
  });
});
