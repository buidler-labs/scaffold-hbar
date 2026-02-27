import { expect } from "chai";
import { ethers } from "hardhat";

describe("HederaToken", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const HederaToken = await ethers.getContractFactory("HederaToken");
    const token = await HederaToken.deploy(owner.address);
    await token.waitForDeployment();
    return { token, owner, alice, bob };
  }

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      const { token } = await deployFixture();
      expect(await token.name()).to.equal("HederaToken");
      expect(await token.symbol()).to.equal("HTK");
    });

    it("should mint initial supply to owner", async function () {
      const { token, owner } = await deployFixture();
      const balance = await token.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther("10000"));
    });
  });

  describe("Transfers", function () {
    it("should transfer tokens between accounts", async function () {
      const { token, owner, alice } = await deployFixture();
      await token.transfer(alice.address, ethers.parseEther("100"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });

    it("should fail transfer with insufficient balance", async function () {
      const { token, alice, bob } = await deployFixture();
      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("1")),
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Minting", function () {
    it("should allow owner to mint", async function () {
      const { token, owner, alice } = await deployFixture();
      await token.mint(alice.address, ethers.parseEther("500"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("500"));
    });

    it("should reject minting from non-owner", async function () {
      const { token, alice } = await deployFixture();
      await expect(
        token.connect(alice).mint(alice.address, ethers.parseEther("100")),
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});
