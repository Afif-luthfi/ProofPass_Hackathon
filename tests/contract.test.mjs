import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { network } from 'hardhat';
import { BrowserProvider, ContractFactory, sha256, toUtf8Bytes, ZeroHash, MaxUint256 } from 'ethers';

const artifact = JSON.parse(await readFile(new URL('../artifacts/ProofPass.json', import.meta.url), 'utf8'));
let connection, provider, alice, bob, contract;
const metadata = sha256(toUtf8Bytes('Example metadata for contract test'));
const document = sha256(toUtf8Bytes('Example document for contract test'));

beforeEach(async () => {
  connection = await network.create('hardhat');
  provider = new BrowserProvider(connection.provider);
  alice = await provider.getSigner(0);
  bob = await provider.getSigner(1);
  contract = await new ContractFactory(artifact.abi, artifact.bytecode, alice).deploy();
  await contract.waitForDeployment();
});
afterEach(async () => { provider?.destroy(); await connection?.close(); });

test('deployment runtime matches compiled artifact exactly', async () => {
  assert.equal(await provider.getCode(await contract.getAddress()), artifact.deployedBytecode);
  assert.equal(await contract.totalProofs(), 0n);
});

test('records sender, original hashes, timestamp and matching event', async () => {
  const receipt = await (await contract.registerProof(metadata, document, true)).wait();
  const proof = await contract.getProof(1);
  assert.equal(proof.recorder, await alice.getAddress());
  assert.equal(proof.metadataHash, metadata);
  assert.equal(proof.documentHash, document);
  assert.equal(proof.hasDocument, true);
  assert.equal(proof.recordedAt, BigInt((await provider.getBlock(receipt.blockNumber)).timestamp));
  const event = contract.interface.parseLog(receipt.logs[0]);
  assert.equal(event.name, 'ProofRegistered');
  assert.equal(event.args.proofId, 1n);
  assert.equal(event.args.recorder, proof.recorder);
  assert.equal(event.args.metadataHash, metadata);
  assert.equal(event.args.documentHash, document);
});

test('text-only proofs require zero document hash and remain explicitly document-free', async () => {
  await (await contract.registerProof(metadata, ZeroHash, false)).wait();
  const proof = await contract.getProof(1);
  assert.equal(proof.hasDocument, false);
  assert.equal(proof.documentHash, ZeroHash);
  await assert.rejects(contract.registerProof.staticCall(metadata, ZeroHash, true), /InvalidDocumentHash/);
  await assert.rejects(contract.registerProof.staticCall(metadata, document, false), /InvalidDocumentHash/);
  await assert.rejects(contract.registerProof.staticCall(ZeroHash, document, true), /EmptyMetadataHash/);
});

test('duplicate prevention is wallet-scoped, preserving different wallets and existing records', async () => {
  await (await contract.registerProof(metadata, document, true)).wait();
  const original = await contract.getProof(1);
  await assert.rejects(contract.registerProof.staticCall(metadata, document, true), /DuplicateProof/);
  await (await contract.connect(bob).registerProof(metadata, document, true)).wait();
  assert.deepEqual([...await contract.getProof(1)], [...original]);
  assert.equal((await contract.getProof(2)).recorder, await bob.getAddress());
  assert.equal(await contract.proofCount(await alice.getAddress()), 1n);
  assert.equal(await contract.proofCount(await bob.getAddress()), 1n);
  assert.equal(await contract.totalProofs(), 2n);
});

test('bounded pagination returns only the requested wallet records', async () => {
  await (await contract.registerProof(metadata, document, true)).wait();
  await (await contract.connect(bob).registerProof(metadata, document, true)).wait();
  await (await contract.registerProof(metadata, ZeroHash, false)).wait();
  assert.deepEqual([...await contract.getProofIds(await alice.getAddress(), 0, 100)], [1n, 3n]);
  assert.deepEqual([...await contract.getProofIds(await alice.getAddress(), 1, 1)], [3n]);
  assert.deepEqual([...await contract.getProofIds(await alice.getAddress(), MaxUint256, 100)], []);
  await assert.rejects(contract.getProofIds(await alice.getAddress(), 0, 0), /InvalidPageSize/);
  await assert.rejects(contract.getProofIds(await alice.getAddress(), 0, 101), /InvalidPageSize/);
  await assert.rejects(contract.getProof(0), /ProofNotFound/);
  await assert.rejects(contract.getProof(4), /ProofNotFound/);
});

test('ordinary transfers and payable registrations are rejected', async () => {
  await assert.rejects(alice.estimateGas({ to: await contract.getAddress(), value: 1n }));
  await assert.rejects(contract.registerProof.staticCall(metadata, document, true, { value: 1n }));
  assert.equal(await provider.getBalance(await contract.getAddress()), 0n);
});
