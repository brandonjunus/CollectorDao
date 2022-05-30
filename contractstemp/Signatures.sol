//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

// import "./IEIP1271.sol";
import "hardhat/console.sol";

contract Signatures {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function recover(
        bytes32 _hash,
        address _signer,
        bytes memory _signature
    ) internal view returns (address) {
        // if (isContract(_signer)) {
        //     bytes4 data = IEIP1271(_signer).isValidSignature(_hash, _signature);
        //     if (data == IEIP1271.isValidSignature.selector) {
        //         return _signer;
        //     }
        //     return address(0);
        // }

        // normal
        if (_signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;

            assembly {
                r := mload(add(_signature, 0x20))
                s := mload(add(_signature, 0x40))
                v := byte(0, mload(add(_signature, 0x60)))
            }
            return recoverECDSA(_hash, v, r, s);
            // eip-2098
        } else if (_signature.length == 64) {
            bytes32 r;
            bytes32 vs;
            // ecrecover takes the signature parameters, and the only way to get them
            // currently is to use assembly.
            assembly {
                r := mload(add(_signature, 0x20))
                vs := mload(add(_signature, 0x40))
            }
            return recoverEIP2098(_hash, r, vs);
        }
        return address(0);
    }

    function recoverEIP2098(
        bytes32 _hash,
        bytes32 _r,
        bytes32 _vs
    ) internal view returns (address) {
        bytes32 s = _vs &
            bytes32(
                0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            );
        uint8 v = uint8((uint256(_vs) >> 255) + 27);
        return recoverECDSA(_hash, v, _r, s);
    }

    function recoverECDSA(
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) internal view returns (address) {
        address signer = ecrecover(_hash, _v, _r, _s);
        console.log(signer);
        return signer;
    }
}
