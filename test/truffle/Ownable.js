// adapted from https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v1.12.0/test/ownership/Claimable.test.js

const { assertFails } = require('./testHelpers');

const Ownable = artifacts.require('Ownable');

contract('Ownable', function (accounts) {
  let ownable;

  beforeEach(async function () {
    ownable = await Ownable.new();
  });

  it('should have an owner', async function () {
    const owner = await ownable.owner();
    assert(owner !== 0);
  });

  it('changes pendingOwner after transfer', async function () {
    const newOwner = accounts[1];
    await ownable.transferOwnership(newOwner);
    const pendingOwner = await ownable.pendingOwner();

    assert(pendingOwner === newOwner);
  });

  it('should prevent to claimOwnership from no pendingOwner', async function () {
    assertFails(ownable.claimOwnership({ from: accounts[2] }));
  });

  it('should prevent non-owners from transfering', async function () {
    const other = accounts[2];
    const owner = await ownable.owner.call();

    assert(owner !== other);
    assertFails(ownable.transferOwnership(other, { from: other }));
  });

  describe('after initiating a transfer', function () {
    let newOwner;

    beforeEach(async function () {
      newOwner = accounts[1];
      await ownable.transferOwnership(newOwner);
    });

    it('changes allow pending owner to claim ownership', async function () {
      await ownable.claimOwnership({ from: newOwner });
      const owner = await ownable.owner();

      assert(owner === newOwner);
    });
  });
});