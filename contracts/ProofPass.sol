// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice Records wallet claims and document fingerprints, not issuer authenticity.
contract ProofPass {
    struct Proof {
        address recorder;
        uint64 recordedAt;
        bool hasDocument;
        bytes32 metadataHash;
        bytes32 documentHash;
    }

    error EmptyMetadataHash();
    error InvalidDocumentHash();
    error ProofNotFound(uint256 proofId);
    error InvalidPageSize();
    error DuplicateProof(uint256 existingId);

    event ProofRegistered(
        uint256 indexed proofId,
        address indexed recorder,
        bytes32 indexed metadataHash,
        bytes32 documentHash,
        bool hasDocument,
        uint64 recordedAt
    );

    uint256 public totalProofs;
    mapping(uint256 => Proof) private proofs;
    mapping(address => uint256[]) private recorderProofIds;
    mapping(address => mapping(bytes32 => uint256)) private registeredPayloads;

    function registerProof(bytes32 metadataHash, bytes32 documentHash, bool hasDocument)
        external returns (uint256 proofId)
    {
        if (metadataHash == bytes32(0)) revert EmptyMetadataHash();
        if (hasDocument == (documentHash == bytes32(0))) revert InvalidDocumentHash();

        // Scoped to the sender so another wallet cannot block someone's registration.
        bytes32 payloadKey = keccak256(abi.encode(metadataHash, documentHash, hasDocument));
        uint256 existingId = registeredPayloads[msg.sender][payloadKey];
        if (existingId != 0) revert DuplicateProof(existingId);

        proofId = ++totalProofs;
        uint64 recordedAt = uint64(block.timestamp);
        proofs[proofId] = Proof(msg.sender, recordedAt, hasDocument, metadataHash, documentHash);
        recorderProofIds[msg.sender].push(proofId);
        registeredPayloads[msg.sender][payloadKey] = proofId;
        emit ProofRegistered(proofId, msg.sender, metadataHash, documentHash, hasDocument, recordedAt);
    }

    function getProof(uint256 proofId) external view returns (Proof memory) {
        if (proofId == 0 || proofId > totalProofs) revert ProofNotFound(proofId);
        return proofs[proofId];
    }

    function proofCount(address recorder) external view returns (uint256) {
        return recorderProofIds[recorder].length;
    }

    function getProofIds(address recorder, uint256 offset, uint256 limit)
        external view returns (uint256[] memory ids)
    {
        if (limit == 0 || limit > 100) revert InvalidPageSize();
        uint256 length = recorderProofIds[recorder].length;
        if (offset >= length) return new uint256[](0);
        uint256 count = length - offset;
        if (count > limit) count = limit;
        ids = new uint256[](count);
        for (uint256 i; i < count; ++i) ids[i] = recorderProofIds[recorder][offset + i];
    }
}
