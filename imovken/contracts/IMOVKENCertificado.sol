// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * IMOVKEN Certificado de Imovel (IMVC)
 *
 * Certificado digital que registra a existencia e o historico de um imovel dentro da plataforma IMOVKEN.
 * NAO e um titulo de propriedade (a propriedade so se transfere com o registro no cartorio), NAO e uma
 * fracao do imovel e NAO e negociavel:
 *  - Os titulares NAO conseguem transferir nem aprovar terceiros (transferFrom/approve sempre falham).
 *  - Somente o endereco da IMOVKEN (owner) emite, reatribui (apos novo registro em cartorio) e revoga.
 *  - O contrato NAO guarda dinheiro e nao recebe pagamentos.
 * Cada certificado guarda o codigo publico e o hash (SHA-256) do dossie, verificaveis em
 * www.imovken.com.br/certificado/<codigo>.
 */
contract IMOVKENCertificado is ERC721, Ownable {
    uint256 public nextId = 1;
    string private _base;
    mapping(uint256 => string) public codeOf;
    mapping(uint256 => bytes32) public dossierOf;
    mapping(bytes32 => uint256) private _byCode;

    event Emitido(uint256 indexed tokenId, string code, address indexed holder, bytes32 dossierHash);
    event DossieAtualizado(uint256 indexed tokenId, bytes32 dossierHash);
    event Reatribuido(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 dossierHash);
    event Revogado(uint256 indexed tokenId, string motivo);

    constructor(string memory baseURI_) ERC721("IMOVKEN Certificado de Imovel", "IMVC") Ownable(msg.sender) {
        _base = baseURI_;
    }

    function emitir(address to, string calldata code, bytes32 dossierHash) external onlyOwner returns (uint256 id) {
        require(to != address(0), "destino invalido");
        require(bytes(code).length > 0 && bytes(code).length <= 32, "codigo invalido");
        bytes32 k = keccak256(bytes(code));
        require(_byCode[k] == 0, "codigo ja emitido");
        id = nextId++;
        _byCode[k] = id;
        codeOf[id] = code;
        dossierOf[id] = dossierHash;
        _mint(to, id);
        emit Emitido(id, code, to, dossierHash);
    }

    function tokenIdDoCodigo(string calldata code) external view returns (uint256) {
        return _byCode[keccak256(bytes(code))];
    }

    function atualizarDossie(uint256 id, bytes32 dossierHash) external onlyOwner {
        _requireOwned(id);
        dossierOf[id] = dossierHash;
        emit DossieAtualizado(id, dossierHash);
    }

    /// Usar somente apos o novo titulo estar registrado em cartorio.
    function reatribuir(uint256 id, address to, bytes32 newDossierHash) external onlyOwner {
        require(to != address(0), "destino invalido");
        address from = _requireOwned(id);
        _update(to, id, address(0));
        dossierOf[id] = newDossierHash;
        emit Reatribuido(id, from, to, newDossierHash);
    }

    function revogar(uint256 id, string calldata motivo) external onlyOwner {
        _requireOwned(id);
        _update(address(0), id, address(0));
        emit Revogado(id, motivo);
    }

    function setBaseURI(string calldata b) external onlyOwner {
        _base = b;
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string.concat(_base, codeOf[id]);
    }

    // Certificado nao negociavel: titulares nao podem transferir nem aprovar.
    function approve(address, uint256) public pure override { revert("certificado intransferivel"); }
    function setApprovalForAll(address, bool) public pure override { revert("certificado intransferivel"); }
    function transferFrom(address, address, uint256) public pure override { revert("certificado intransferivel"); }
}
