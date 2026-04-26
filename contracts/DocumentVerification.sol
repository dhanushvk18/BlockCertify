// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentVerification {
    mapping(string => bool) private documents;

    function addDocument(string memory hash) public {
        documents[hash] = true;
    }

    function verifyDocument(string memory hash) public view returns (bool) {
        return documents[hash];
    }
}