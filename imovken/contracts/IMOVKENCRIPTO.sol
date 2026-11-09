// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * IMOVKENCRIPTO (IKEN)
 *
 * Token ERC-20 de utilidade da plataforma IMOVKEN.
 *
 * Desenho deliberadamente simples e transparente:
 *  - Oferta fixa: todo o supply é criado UMA vez, no deploy, para a carteira que publica o contrato.
 *  - Sem função de mint: ninguém (nem o criador) consegue criar mais tokens depois.
 *  - Sem dono/admin, sem taxa de transferência, sem lista negra, sem pausa.
 *  - Queima voluntária: qualquer titular pode queimar os próprios tokens.
 *
 * Este contrato NÃO promete retorno, valorização ou participação em resultados.
 */
contract IMOVKENCRIPTO is ERC20, ERC20Burnable {
    /// @param initialSupplyWhole quantidade de tokens INTEIROS (o contrato multiplica por 10**18).
    ///        Ex.: 1000000000 = 1 bilhão de IKEN.
    constructor(uint256 initialSupplyWhole) ERC20("IMOVKENCRIPTO", "IKEN") {
        require(initialSupplyWhole > 0 && initialSupplyWhole <= 1_000_000_000_000, "supply fora do limite");
        _mint(msg.sender, initialSupplyWhole * 10 ** decimals());
    }
}
