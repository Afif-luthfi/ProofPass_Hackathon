import { readFile, mkdir, writeFile } from 'node:fs/promises';
import solc from 'solc';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('contracts/ProofPass.sol', root), 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'ProofPass.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    // Paris avoids requiring newer opcodes on an EVM-compatible chain.
    evmVersion: 'paris',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const issue of output.errors ?? []) console.error(issue.formattedMessage);
if ((output.errors ?? []).some(issue => issue.severity === 'error')) process.exit(1);
const contract = output.contracts['ProofPass.sol'].ProofPass;
const artifact = {
  contractName: 'ProofPass', compiler: solc.version(), evmVersion: 'paris',
  optimizer: input.settings.optimizer,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`,
  deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
};
await mkdir(new URL('artifacts/', root), { recursive: true });
await writeFile(new URL('artifacts/ProofPass.json', root), JSON.stringify(artifact, null, 2));
await writeFile(new URL('artifacts/solc-input.json', root), JSON.stringify(input, null, 2));
console.log(`ProofPass compiled: ${artifact.compiler}; EVM paris; ${(artifact.bytecode.length - 2) / 2} bytes.`);
